import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../shared/logger';
import prisma from '../database/client';
import { authRouter } from './routes/auth';
import { guildsRouter } from './routes/guilds';
import { configRouter } from './routes/config';
import { invitesRouter } from './routes/invites';
import { moderationRouter } from './routes/moderation';
import { ticketsRouter } from './routes/tickets';
import { automationRouter } from './routes/automation';
import { backupsRouter } from './routes/backups';
import { statsRouter } from './routes/stats';
import { reputationRouter } from './routes/reputation';
import { giveawaysRouter, suggestionsRouter } from './routes/social';
import { starboardRouter } from './routes/starboard';
import { welcomeRouter } from './routes/welcome';
import { reactionRolesRouter } from './routes/reactionroles';
import { stickyRouter } from './routes/sticky';
import { loggingRouter } from './routes/logging';

dotenv.config();

// Validate required env vars
const requiredEnv = ['API_SECRET', 'SESSION_SECRET', 'CLIENT_ID', 'CLIENT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// ─── Security Middleware ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", 'https:', 'http:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  hsts: false,
}));
app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
}));

// ─── Routes ──────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/guilds', guildsRouter);
app.use('/api/guilds/:guildId/config', configRouter);
app.use('/api/guilds/:guildId/invites', invitesRouter);
app.use('/api/guilds/:guildId/moderation', moderationRouter);
app.use('/api/guilds/:guildId/tickets', ticketsRouter);
app.use('/api/guilds/:guildId/automation', automationRouter);
app.use('/api/guilds/:guildId/backups', backupsRouter);
app.use('/api/guilds/:guildId/stats', statsRouter);
app.use('/api/guilds/:guildId/reputation', reputationRouter);
app.use('/api/guilds/:guildId/giveaways', giveawaysRouter);
app.use('/api/guilds/:guildId/suggestions', suggestionsRouter);
app.use('/api/guilds/:guildId/starboard', starboardRouter);
app.use('/api/guilds/:guildId/welcome', welcomeRouter);
app.use('/api/guilds/:guildId/reactionroles', reactionRolesRouter);
app.use('/api/guilds/:guildId/sticky', stickyRouter);
app.use('/api/guilds/:guildId/logging', loggingRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// In production, serve the built dashboard and handle React Router
if (process.env.NODE_ENV === 'production') {
  const dashboardDist = path.join(__dirname, '../../dashboard/dist');
  app.use(express.static(dashboardDist));
  app.get('*', (_, res) => res.sendFile(path.join(dashboardDist, 'index.html')));
}

// 404 handler
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`API Error: ${err.message}${err.stack ? `\n${err.stack}` : ''}`);

  // Prisma-specific errors
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'A record with this data already exists' });
    return;
  }

  const status = (err as any).status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start ───────────────────────────────────────────────
async function start() {
  await prisma.$connect();
  logger.info('API connected to database');

  app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT}`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start API: ${err}`);
  process.exit(1);
});

export default app;
