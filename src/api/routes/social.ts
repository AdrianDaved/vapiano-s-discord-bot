import { Router, Response } from 'express';
import { createGuildRouter, requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

export const giveawaysRouter = createGuildRouter();
/**
 * GET /api/guilds/:guildId/giveaways — List giveaways
 */
giveawaysRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const status = req.query.status as string | undefined;

  const where: any = { guildId };
  if (status === 'active') where.ended = false;
  else if (status === 'ended') where.ended = true;

  const giveaways = await prisma.giveaway.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(giveaways);
}));

/**
 * GET /api/guilds/:guildId/suggestions — List suggestions
 */
export const suggestionsRouter = createGuildRouter();
suggestionsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const status = req.query.status as string | undefined;

  const where: any = { guildId };
  if (status) where.status = status;

  const suggestions = await prisma.suggestion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(suggestions);
}));
