import { Router, Response } from 'express';
import { requireAuth, AuthRequest, fetchUserGuilds } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

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
