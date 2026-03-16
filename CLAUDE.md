# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run all three concurrently)
npm run dev:all          # bot + API + dashboard dev servers

# Individual services
npm run dev              # bot only (tsx watch)
npm run api              # Express API only (tsx watch)
npm run dashboard:dev    # React dashboard only (Vite)

# Build
npm run build            # compile TypeScript → dist/
npm run dashboard:build  # build dashboard → dashboard/dist/

# Database
npm run db:migrate       # run prisma migrations (dev)
npm run db:push          # push schema changes without migration
npm run db:studio        # open Prisma Studio

# Deploy slash commands to Discord
npm run deploy:commands

# Lint
npm run lint             # eslint on src/**/*.ts
```

## Architecture

This is a three-process application that must all run together:

| Process | Entry | Port |
|---------|-------|------|
| Discord bot | `src/bot/index.ts` | — |
| REST API | `src/api/index.ts` | `API_PORT` (default 3001) |
| Dashboard | `dashboard/src/` | 5173 (Vite) |

All three share the same PostgreSQL database via a single Prisma client at `src/database/client.ts`.

### Bot internals

- **Commands** are in `src/bot/commands/<module>/` and auto-loaded by `commandHandler.ts`. Each file must export a default object matching the `SlashCommand` interface (`data` + `execute`).
- **Events** are in `src/bot/events/` and auto-loaded by `eventHandler.ts`. Each file exports `{ name, execute }`.
- **Module logic** lives in `src/bot/modules/<module>/`. Commands call into these managers rather than containing business logic themselves.
- Commands are deployed as **guild commands** (not global) for instant updates. This happens automatically in the `ready` event.

### Module system

Every feature is a toggleable module. `GuildConfig` in the Prisma schema stores a `<module>Enabled` boolean for each module. The mapping from module name to DB field is `MODULE_TOGGLE_MAP` in `src/shared/types.ts`. Commands that require a module check this flag at the start of `execute`.

### API + Dashboard

- API routes follow the pattern `/api/guilds/:guildId/<module>` — one router file per module in `src/api/routes/`.
- Auth uses Passport + Discord OAuth2, with a JWT issued after login. The `authMiddleware` in `src/api/middleware/` validates the JWT on protected routes.
- The dashboard (`dashboard/src/lib/api.ts`) is a typed API client that wraps all backend calls. Auth state is managed via `useAuth` context; guild data via `useGuild` context.

### Environment variables

Required at minimum: `BOT_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `OAUTH_REDIRECT_URI`, `DASHBOARD_URL`.

Note: the bot checks for `BOT_TOKEN` (not `DISCORD_TOKEN` as shown in README).

## Important design decisions

- **Dashboard**: The web dashboard is intentionally hidden from all bot-facing text (help, embeds, error messages). It is only accessible via its own URL + OAuth2.
- **`/rep` cooldown**: The per-give cooldown is permanently removed. `/rep dar` has no wait time. The `repCooldown` DB field is unused; `/configuracion establecer reputation` only allows setting a channel restriction, not a cooldown.
- **`/mod borrar` removed**: Duplicate of `/purgar`. Use `/purgar` for bulk message deletion (has more filters).
- **Ticket close embed**: Automatically shows how long the ticket was open (e.g. "Tiempo abierto: 1h 23m") in both the channel embed and the log.
- **Suggestion vote field**: The field is named `Votos` (not `Votes`) in vote update logic — keep consistent.
