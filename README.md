# Discord Moderation Bot

A powerful, self-hosted Discord moderation bot with reaction roles, ban, kick, and timeout features. Built with Discord.js v14 and designed for easy deployment through GitHub.

## Features

### 🔨 Moderation Commands
- **Ban**: Ban users with optional message deletion and custom reasons
- **Kick**: Remove users from the server with custom reasons  
- **Timeout**: Temporarily mute users for specified durations (1-40320 minutes)

### ⚡ Reaction Roles
- **Add reaction roles**: Users get roles by reacting to messages
- **Remove reaction roles**: Remove existing reaction role setups
- **List reaction roles**: View all configured reaction roles
- **Persistent storage**: Reaction roles survive bot restarts

### 🛡️ Security Features
- Permission checks for all moderation commands
- Error handling and validation
- Audit logging with embedded messages
- Bot permission verification

## Setup

### Prerequisites
- Node.js 16.0.0 or higher
- A Discord bot token
- Discord server with appropriate permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/discord-moderation-bot.git
   cd discord-moderation-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   # Rename "rename to .env.txt" to .env
   # Edit .env and add your Discord bot token
   

4. **Start the bot**
   ```bash
   npm start
   ```

### Discord Bot Setup

1. **Create a Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application" and give it a name
   - Go to the "Bot" section and create a bot
   - Copy the bot token and add it to your `.env` file

2. **Set Bot Permissions**
   Your bot needs these permissions:
   - `Manage Roles`
   - `Kick Members`
   - `Ban Members`
   - `Moderate Members` (for timeouts)
   - `Add Reactions`
   - `Read Messages`
   - `Send Messages`
   - `Use Slash Commands`

3. **Invite Bot to Server**
   - Go to the OAuth2 > URL Generator
   - Select `bot` and `applications.commands` scopes
   - Select the permissions listed above
   - Use the generated URL to invite your bot

## Commands

### Moderation Commands

#### `/ban`
Ban a user from the server.
- `user`: The user to ban (required)
- `reason`: Reason for the ban (optional)
- `delete_messages`: Days of messages to delete: 0, 1, or 7 (optional)

#### `/kick`
Kick a user from the server.
- `user`: The user to kick (required)
- `reason`: Reason for the kick (optional)

#### `/timeout`
Temporarily timeout a user.
- `user`: The user to timeout (required)
- `duration`: Duration in minutes, 1-40320 (required)
- `reason`: Reason for the timeout (optional)

### Reaction Role Commands

#### `/reactionrole add`
Set up a new reaction role.
- `emoji`: The emoji users will react with (required)
- `role`: The role to assign (required)
- `message_id`: ID of the message to add the reaction to (required)

#### `/reactionrole remove`
Remove an existing reaction role.
- `emoji`: The emoji to remove (required)
- `message_id`: ID of the message (required)

#### `/reactionrole list`
List all configured reaction roles in the server.

### Other Commands

#### `/help`
Display help information with all available commands.

## Deployment Options

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production Deployment

#### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start bot.js --name "plural-moderation"
pm2 startup
pm2 save
```

#### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

#### GitHub Actions (CI/CD)
The bot can be deployed using GitHub Actions to various platforms like Railway, Heroku, or your own server.

## Data Storage

The bot stores reaction role configurations in a local `bot-data.json` file. This file is automatically created and updated as you configure reaction roles.

**Important**: Make sure to backup this file if you have important reaction role configurations!

## Permissions Required

Your bot needs these Discord permissions:
- **Manage Roles**: For reaction roles
- **Kick Members**: For kick command  
- **Ban Members**: For ban command
- **Moderate Members**: For timeout command
- **Add Reactions**: To add reactions for reaction roles
- **Send Messages**: To send command responses
- **Use Slash Commands**: For slash command functionality

## Troubleshooting

### Common Issues

**Bot not responding to commands**
- Ensure the bot has "Use Slash Commands" permission
- Check that the bot is online and properly invited
- Verify your token is correct in the .env file

**Reaction roles not working**
- Make sure the bot has "Manage Roles" permission
- Check that the bot's role is higher than the roles it's trying to assign
- Verify the message ID and emoji are correct

**Moderation commands failing**
- Ensure the bot has appropriate moderation permissions
- Check that the bot's role hierarchy is higher than the target user
- Verify the user running the command has "Moderate Members" permission

### Error Logging

The bot logs errors to the console. Check your hosting platform's logs for detailed error information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section
2. Review the Discord.js documentation
3. Create an issue on GitHub

---


**Note**: This bot is designed to be lightweight and efficient while providing essential moderation features. It's perfect for small to medium-sized Discord servers that need reliable moderation tools without the complexity of larger bots.
