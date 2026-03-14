# Vapiano Bot

An all-in-one Discord bot with invite tracking, server backups, XP leveling, advanced moderation, automod, automation, tickets, and a full web dashboard.

## Features

| Module | Replaces | Description |
|--------|----------|-------------|
| **Invite Tracker** | InviteTracker | Track who invited whom, valid/fake/leave counts, leaderboard |
| **Backup** | Xenon | Save and restore server config (channels, roles, permissions) |
| **Leveling** | Koya | XP system with configurable cooldown, role rewards, leaderboard |
| **Moderation** | Carl Bot / YAGPDB | Warn, mute, kick, ban, tempmute, tempban, clear, lock/unlock, mod logs |
| **AutoMod** | Carl Bot | Anti-spam, anti-caps, anti-links, word blacklist, exempted roles |
| **Automation** | YAGPDB | Auto-responses, scheduled messages, polls |
| **Tickets** | Ticket Tool | Button-based ticket panels, close/reopen/transcript/claim |
| **Dashboard** | — | Full web dashboard with Discord OAuth2 for all bot settings |

## Tech Stack

- **Bot**: TypeScript, discord.js v14
- **API**: Express.js with JWT auth
- **Dashboard**: React 18, Tailwind CSS, Vite
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker + Docker Compose

## Project Structure

```
├── prisma/
│   └── schema.prisma          # All database models
├── src/
│   ├── bot/
│   │   ├── index.ts            # Bot entry point
│   │   ├── commands/           # Slash commands (organized by module)
│   │   ├── events/             # Discord event handlers
│   │   ├── modules/            # Core module logic
│   │   ├── handlers/           # Command & event loaders
│   │   └── utils/              # Utility functions & caching
│   ├── api/
│   │   ├── index.ts            # Express entry point
│   │   ├── routes/             # API routes (auth, guilds, config, etc.)
│   │   └── middleware/         # Auth middleware
│   ├── shared/
│   │   ├── types.ts            # Shared TypeScript types
│   │   └── logger.ts           # Winston logger
│   └── database/
│       └── client.ts           # Prisma client instance
├── dashboard/
│   ├── src/
│   │   ├── App.tsx             # Router & auth wrapper
│   │   ├── hooks/              # useAuth, useGuild contexts
│   │   ├── components/         # Reusable UI (Card, Toggle, Modal, Table, etc.)
│   │   ├── pages/              # Login, GuildSelect, Dashboard
│   │   │   └── modules/        # Config, Invites, Leveling, Mod, AutoMod, Tickets, Automation, Backups
│   │   └── lib/
│   │       └── api.ts          # API client
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A Discord application with bot token (https://discord.com/developers/applications)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd vapiano-bot-discord

# Install bot + API dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Discord
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vapiano_bot

# API
API_PORT=3001
JWT_SECRET=your_random_jwt_secret
SESSION_SECRET=your_random_session_secret

# OAuth
OAUTH_REDIRECT_URI=http://localhost:3001/auth/callback
DASHBOARD_URL=http://localhost:5173
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run in development

Start all three services:

```bash
# Terminal 1 — Bot
npx ts-node src/bot/index.ts

# Terminal 2 — API
npx ts-node src/api/index.ts

# Terminal 3 — Dashboard
cd dashboard && npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 5. Build for production

```bash
# Build bot + API
npm run build

# Build dashboard
cd dashboard && npm run build
```

## Docker Deployment

```bash
# Build and start everything
docker-compose up -d --build

# Run database migrations
docker-compose exec bot npx prisma db push
```

The `docker-compose.yml` includes:
- PostgreSQL database
- Bot + API server
- Dashboard (served by the API in production, or build separately)

## Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to **Bot** tab and create a bot — copy the token
4. Go to **OAuth2** tab:
   - Add redirect URI: `http://localhost:3001/auth/callback` (or your production URL)
   - Copy Client ID and Client Secret
5. Enable these **Privileged Gateway Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
6. Invite the bot to your server using:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

## Security Best Practices

- **Never commit `.env`** — it's in `.gitignore`
- **JWT tokens** expire and are validated on every API request
- **Guild permission checks** — the API verifies the user has `MANAGE_GUILD` permission before allowing changes
- **Rate limiting** — API uses express-rate-limit to prevent abuse
- **Helmet** — HTTP security headers are set via helmet middleware
- **CORS** — restricted to dashboard origin only
- **Input validation** — all API inputs are validated before database operations
- **No direct DB exposure** — all data goes through the API layer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC
