# Vapiano Bot

An all-in-one Discord bot with invite tracking, server backups, XP leveling, advanced moderation, automod, automation, tickets, and a full web dashboard.

## Discord Server: 

https://discord.gg/aknYkaKN85

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


## License

ISC
