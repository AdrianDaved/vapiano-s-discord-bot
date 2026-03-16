import { Router, Response } from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { requireAuth, requireGuildAccess, AuthRequest, fetchUserGuilds } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

const channelsCache = new Map<string, { data: any[]; expiresAt: number }>();
const rolesCache = new Map<string, { data: any[]; expiresAt: number }>();
const CHANNELS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const guildsRouter = Router();

guildsRouter.use(requireAuth as any);

/**
 * GET /api/guilds — List guilds where the user has management permissions
 * and indicate which ones the bot is in.
 */
guildsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Fetch user's guilds from Discord (cached to avoid rate limits)
  const allGuilds = await fetchUserGuilds(req.user!.id, req.user!.accessToken);

  if (!allGuilds) {
    res.status(502).json({ error: 'Failed to fetch guilds from Discord' });
    return;
  }

  // Filter to guilds where user has Manage Guild or Admin
  const manageable = allGuilds.filter((g: any) => {
    const perms = BigInt(g.permissions);
    return g.owner || (perms & BigInt(0x20)) !== BigInt(0) || (perms & BigInt(0x8)) !== BigInt(0);
  });

  // Check which guilds the bot is in by querying the database
  const guildConfigs = await prisma.guildConfig.findMany({
    where: { id: { in: manageable.map((g: any) => g.id) } },
    select: { id: true },
  });

  const botGuildIds = new Set(guildConfigs.map((g: any) => g.id));

  const guilds = manageable.map((g: any) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    iconUrl: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
      : null,
    owner: g.owner,
    botPresent: botGuildIds.has(g.id),
  }));

  res.json(guilds);
}));

/**
 * GET /api/guilds/:guildId/channels — List channels and categories from Discord
 */
guildsRouter.get('/:guildId/channels', requireAuth as any, requireGuildAccess as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const cached = channelsCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  const channels = await rest.get(Routes.guildChannels(guildId)) as any[];

  const result = channels
    .filter((c) => [0, 2, 4, 5, 15, 16].includes(c.type))
    .map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position, parentId: c.parent_id ?? null }))
    .sort((a, b) => a.position - b.position);

  channelsCache.set(guildId, { data: result, expiresAt: Date.now() + CHANNELS_CACHE_TTL });
  res.json(result);
}));

/**
 * GET /api/guilds/:guildId/roles — List roles from Discord
 */
guildsRouter.get('/:guildId/roles', requireAuth as any, requireGuildAccess as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const cached = rolesCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
  const roles = await rest.get(Routes.guildRoles(guildId)) as any[];

  const result = roles
    .filter((r) => r.name !== '@everyone')
    .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
    .sort((a, b) => b.position - a.position);

  rolesCache.set(guildId, { data: result, expiresAt: Date.now() + CHANNELS_CACHE_TTL });
  res.json(result);
}));
