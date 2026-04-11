/**
 * Starboard API routes — Manage starboard entries for a guild.
 */
import { Router, Response } from 'express';
import { createGuildRouter, requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { starboardSettingsSchema } from '../schemas';
import prisma from '../../database/client';

export const starboardRouter = createGuildRouter();
/**
 * GET /api/guilds/:guildId/starboard — List starboard entries
 */
starboardRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.starboardEntry.findMany({
      where: { guildId },
      orderBy: { stars: 'desc' },
      skip,
      take: limit,
    }),
    prisma.starboardEntry.count({ where: { guildId } }),
  ]);

  res.json({ entries, total, page, pages: Math.ceil(total / limit) });
}) as any);

/**
 * GET /api/guilds/:guildId/starboard/settings — Get starboard settings
 */
starboardRouter.get('/settings', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const config = await prisma.guildConfig.findUnique({
    where: { id: guildId },
    select: {
      starboardEnabled: true,
      starboardChannelId: true,
      starboardEmoji: true,
      starboardThreshold: true,
    },
  });

  res.json(config || {});
}) as any);

/**
 * PATCH /api/guilds/:guildId/starboard/settings — Update starboard settings
 */
starboardRouter.patch('/settings', validate(starboardSettingsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const data = req.body;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields provided' });
    return;
  }

  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId, ...data },
    update: data,
  });

  res.json(config);
}) as any);

/**
 * DELETE /api/guilds/:guildId/starboard/:entryId — Delete a starboard entry
 */
starboardRouter.delete('/:entryId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const entryId = req.params.entryId as string;

  const entry = await prisma.starboardEntry.findFirst({
    where: { id: entryId, guildId },
  });

  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }

  await prisma.starboardEntry.delete({ where: { id: entryId } });
  res.json({ success: true });
}) as any);
