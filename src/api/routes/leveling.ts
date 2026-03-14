import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { levelRewardCreateSchema } from '../schemas';
import prisma from '../../database/client';

export const levelingRouter = Router({ mergeParams: true });

levelingRouter.use(requireAuth as any);
levelingRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/leveling — Get leaderboard
 */
levelingRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const users = await prisma.userLevel.findMany({
    where: { guildId },
    orderBy: { xp: 'desc' },
    take: limit,
  });

  res.json(users);
}));

/**
 * GET /api/guilds/:guildId/leveling/rewards — Get level rewards
 */
levelingRouter.get('/rewards', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const rewards = await prisma.levelReward.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });

  res.json(rewards);
}));

/**
 * POST /api/guilds/:guildId/leveling/rewards — Add a level reward
 */
levelingRouter.post('/rewards', validate(levelRewardCreateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { level, roleId } = req.body;

  const reward = await prisma.levelReward.upsert({
    where: { guildId_level_roleId: { guildId, level, roleId } },
    create: { guildId, level, roleId },
    update: {},
  });

  res.json(reward);
}));

/**
 * DELETE /api/guilds/:guildId/leveling/rewards/:id — Remove a level reward
 */
levelingRouter.delete('/rewards/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.levelReward.delete({ where: { id: id as string } });
  res.json({ success: true });
}));
