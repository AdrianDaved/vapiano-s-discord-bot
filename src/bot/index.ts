import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { BotClient } from '../shared/types';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';
import logger from '../shared/logger';
import prisma from '../database/client';

dotenv.config();

// Validate required env vars
const required = ['BOT_TOKEN', 'CLIENT_ID'];
for (const key of required) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Create the Discord client with all needed intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
  ],
}) as BotClient;

client.commands = new Collection();
client.cooldowns = new Collection();

// Boot sequence
async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);

    // Login — commands are deployed in the ready event after guilds are cached
    await client.login(process.env.BOT_TOKEN);
  } catch (err) {
    logger.error(`Failed to start bot: ${err}`);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  // Clear all timers
  const { clearAllTimers } = await import('./modules/timerRegistry');
  clearAllTimers();
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Fatal-error handlers: log, release resources, and exit so the process
// manager (PM2) can restart us cleanly. Continuing with partial state after
// an unhandled rejection or uncaught exception leaves the bot in an
// unpredictable state and silently drops timers and DB connections.
let isExiting = false;
async function fatalExit(kind: string, err: unknown): Promise<never> {
  if (isExiting) process.exit(1);
  isExiting = true;
  logger.error(`${kind}: ${err instanceof Error ? err.stack || err.message : String(err)}`);
  try {
    const { clearAllTimers } = await import('./modules/timerRegistry');
    clearAllTimers();
    await prisma.$disconnect().catch(() => {});
    client.destroy();
  } catch {
    // ignore cleanup failures — we're already crashing
  }
  process.exit(1);
}

process.on('unhandledRejection', (err) => { void fatalExit('Unhandled rejection', err); });
process.on('uncaughtException', (err) => { void fatalExit('Uncaught exception', err); });

main();
