import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

export const reputationRouter = Router({ mergeParams: true });

reputationRouter.use(requireAuth as any);
reputationRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/reputation — Get reputation leaderboard
 */
reputationRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const leaderboard = await prisma.reputation.groupBy({
    by: ['userId'],
    where: { guildId },
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 50,
  });

  res.json(
    leaderboard.map((entry) => ({
      userId: entry.userId,
      rep: entry._count.userId,
    }))
  );
}));

/**
 * GET /api/guilds/:guildId/reputation/recent — Get recent rep activity
 */
reputationRouter.get('/recent', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const recent = await prisma.reputation.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(recent);
}));
