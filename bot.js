const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

class ModerationBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions
            ]
        });

        this.reactionRoles = new Map();
        this.dataFile = './bot-data.json';
        this.loadData();
        this.setupEventHandlers();
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            this.reactionRoles = new Map(parsed.reactionRoles || []);
        } catch (error) {
            console.log('No existing data file found, starting fresh');
        }
    }

    async saveData() {
        const data = {
            reactionRoles: Array.from(this.reactionRoles.entries())
        };
        await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        });

        // Slash commands handler
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            try {
                await this.handleSlashCommand(interaction);
            } catch (error) {
                console.error('Error handling slash command:', error);
                const reply = { content: 'An error occurred while executing this command.', ephemeral: true };
                if (interaction.replied) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        });

        this.client.on('guildCreate', () => {
            console.log('Joined a new server!');
            this.setStatus();
        });

        this.client.on('guildDelete', () => {
            console.log('Left a server.');
            this.setStatus();
        });
        this.client.on('messageReactionAdd', async (reaction, user) => {
            if (user.bot) return;
            await this.handleReactionRole(reaction, user, 'add');
        });

        this.client.on('messageReactionRemove', async (reaction, user) => {
            if (user.bot) return;
            await this.handleReactionRole(reaction, user, 'remove');
        });
    }

    async handleSlashCommand(interaction) {
        const { commandName, options } = interaction;

        // Check permissions for moderation commands
        const moderationCommands = ['ban', 'kick', 'timeout', 'reactionrole'];
        if (moderationCommands.includes(commandName) && 
            !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ You need Moderate Members permission to use this command.', 
                ephemeral: true 
            });
        }

        switch (commandName) {
            case 'ban':
                await this.handleBan(interaction);
                break;
            case 'kick':
                await this.handleKick(interaction);
                break;
            case 'timeout':
                await this.handleTimeout(interaction);
                break;
            case 'reactionrole':
                await this.handleReactionRoleSetup(interaction);
                break;
            case 'help':
                await this.handleHelp(interaction);
                break;
        }
    }

    async handleBan(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessages = interaction.options.getInteger('delete_messages') || 0;

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.bannable) {
                return interaction.reply({ 
                    content: '❌ Cannot ban this user. They may have higher permissions.', 
                    ephemeral: true 
                });
            }

            await member.ban({ 
                reason: `Banned by ${interaction.user.tag}: ${reason}`,
                deleteMessageDays: deleteMessages
            });

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔨 User Banned')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({ 
                content: '❌ Failed to ban user. Please check my permissions.', 
                ephemeral: true 
            });
        }
    }

    async handleKick(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.kickable) {
                return interaction.reply({ 
                    content: '❌ Cannot kick this user. They may have higher permissions.', 
                    ephemeral: true 
                });
            }

            await member.kick(`Kicked by ${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('👢 User Kicked')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({ 
                content: '❌ Failed to kick user. Please check my permissions.', 
                ephemeral: true 
            });
        }
    }

    async handleTimeout(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member.moderatable) {
                return interaction.reply({ 
                    content: '❌ Cannot timeout this user. They may have higher permissions.', 
                    ephemeral: true 
                });
            }

            const timeoutUntil = new Date(Date.now() + (duration * 60 * 1000));
            await member.timeout(duration * 60 * 1000, `Timed out by ${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('🔇 User Timed Out')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Duration', value: `${duration} minutes`, inline: true },
                    { name: 'Until', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Timeout error:', error);
            await interaction.reply({ 
                content: '❌ Failed to timeout user. Please check my permissions.', 
                ephemeral: true 
            });
        }
    }

    async handleReactionRoleSetup(interaction) {
        const action = interaction.options.getSubcommand();
        
        if (action === 'add') {
            const emoji = interaction.options.getString('emoji');
            const role = interaction.options.getRole('role');
            const message = interaction.options.getString('message_id');

            try {
                const targetMessage = await interaction.channel.messages.fetch(message);
                await targetMessage.react(emoji);
                
                const key = `${targetMessage.id}-${emoji}`;
                this.reactionRoles.set(key, {
                    messageId: message,
                    emoji: emoji,
                    roleId: role.id,
                    guildId: interaction.guild.id,
                    channelId: interaction.channel.id
                });
                
                await this.saveData();
                
                await interaction.reply({ 
                    content: `✅ Reaction role set up! React with ${emoji} to get the ${role.name} role.`, 
                    ephemeral: true 
                });
            } catch (error) {
                console.error('Reaction role setup error:', error);
                await interaction.reply({ 
                    content: '❌ Failed to set up reaction role. Check the message ID and emoji.', 
                    ephemeral: true 
                });
            }
        } else if (action === 'remove') {
            const emoji = interaction.options.getString('emoji');
            const message = interaction.options.getString('message_id');
            
            const key = `${message}-${emoji}`;
            if (this.reactionRoles.delete(key)) {
                await this.saveData();
                await interaction.reply({ 
                    content: `✅ Reaction role removed for ${emoji}`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: '❌ No reaction role found for that emoji and message.', 
                    ephemeral: true 
                });
            }
        } else if (action === 'list') {
            const guildRoles = Array.from(this.reactionRoles.values())
                .filter(rr => rr.guildId === interaction.guild.id);
            
            if (guildRoles.length === 0) {
                return interaction.reply({ 
                    content: 'No reaction roles set up in this server.', 
                    ephemeral: true 
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Reaction Roles')
                .setDescription(guildRoles.map(rr => {
                    const role = interaction.guild.roles.cache.get(rr.roleId);
                    return `${rr.emoji} → ${role ? role.name : 'Deleted Role'} (Message: ${rr.messageId})`;
                }).join('\n'))
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    async handleReactionRole(reaction, user, action) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Failed to fetch reaction:', error);
                return;
            }
        }

        const key = `${reaction.message.id}-${reaction.emoji.name || reaction.emoji.id}`;
        const reactionRole = this.reactionRoles.get(key);
        
        if (!reactionRole) return;

        try {
            const guild = this.client.guilds.cache.get(reactionRole.guildId);
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.get(reactionRole.roleId);
            
            if (!role) {
                console.log(`Role ${reactionRole.roleId} not found, cleaning up reaction role`);
                this.reactionRoles.delete(key);
                await this.saveData();
                return;
            }

            if (action === 'add' && !member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                console.log(`Added role ${role.name} to ${user.tag}`);
            } else if (action === 'remove' && member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                console.log(`Removed role ${role.name} from ${user.tag}`);
            }
        } catch (error) {
            console.error('Error handling reaction role:', error);
        }
    }

    async handleHelp(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 Plural Moderation Commands')
            .setDescription('Here are all available commands:')
            .addFields(
                { 
                    name: '🔨 Moderation Commands', 
                    value: '`/ban` - Ban a user\n`/kick` - Kick a user\n`/timeout` - Timeout a user', 
                    inline: false 
                },
                { 
                    name: '⚡ Reaction Roles', 
                    value: '`/reactionrole add` - Add reaction role\n`/reactionrole remove` - Remove reaction role\n`/reactionrole list` - List all reaction roles', 
                    inline: false 
                },
                { 
                    name: '❓ Other', 
                    value: '`/help` - Show this help message', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Use slash commands to interact with the bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async registerCommands() {
        const commands = [
            {
                name: 'ban',
                description: 'Ban a user from the server',
                options: [
                    {
                        name: 'user',
                        description: 'User to ban',
                        type: 6, // USER type
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'Reason for the ban',
                        type: 3, // STRING type
                        required: false
                    },
                    {
                        name: 'delete_messages',
                        description: 'Days of messages to delete (0-7)',
                        type: 4, // INTEGER type
                        required: false,
                        choices: [
                            { name: 'Don\'t delete any', value: 0 },
                            { name: '1 day', value: 1 },
                            { name: '7 days', value: 7 }
                        ]
                    }
                ]
            },
            {
                name: 'kick',
                description: 'Kick a user from the server',
                options: [
                    {
                        name: 'user',
                        description: 'User to kick',
                        type: 6,
                        required: true
                    },
                    {
                        name: 'reason',
                        description: 'Reason for the kick',
                        type: 3,
                        required: false
                    }
                ]
            },
            {
                name: 'timeout',
                description: 'Timeout a user',
                options: [
                    {
                        name: 'user',
                        description: 'User to timeout',
                        type: 6,
                        required: true
                    },
                    {
                        name: 'duration',
                        description: 'Duration in minutes (1-40320)',
                        type: 4,
                        required: true,
                        min_value: 1,
                        max_value: 40320
                    },
                    {
                        name: 'reason',
                        description: 'Reason for the timeout',
                        type: 3,
                        required: false
                    }
                ]
            },
            {
                name: 'reactionrole',
                description: 'Manage reaction roles',
                options: [
                    {
                        name: 'add',
                        description: 'Add a reaction role',
                        type: 1, // SUB_COMMAND
                        options: [
                            {
                                name: 'emoji',
                                description: 'Emoji to react with',
                                type: 3,
                                required: true
                            },
                            {
                                name: 'role',
                                description: 'Role to assign',
                                type: 8, // ROLE type
                                required: true
                            },
                            {
                                name: 'message_id',
                                description: 'ID of the message to add reaction to',
                                type: 3,
                                required: true
                            }
                        ]
                    },
                    {
                        name: 'remove',
                        description: 'Remove a reaction role',
                        type: 1,
                        options: [
                            {
                                name: 'emoji',
                                description: 'Emoji to remove',
                                type: 3,
                                required: true
                            },
                            {
                                name: 'message_id',
                                description: 'ID of the message',
                                type: 3,
                                required: true
                            }
                        ]
                    },
                    {
                        name: 'list',
                        description: 'List all reaction roles',
                        type: 1
                    }
                ]
            },
            {
                name: 'help',
                description: 'Show help information'
            }
        ];

        try {
            console.log('Registering slash commands...');
            await this.client.application.commands.set(commands);
            console.log('Successfully registered slash commands!');
        } catch (error) {
            console.error('Error registering commands:', error);
        }
    }

    async start(token) {
        await this.client.login(token);
    }
}

// Initialize and start the bot
const bot = new ModerationBot();

// Get token from environment variable
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('Please provide a DISCORD_TOKEN environment variable');
    process.exit(1);
}

bot.start(token).catch(console.error);

module.exports = ModerationBot;