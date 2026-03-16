import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

export const moderationRouter = Router({ mergeParams: true });

moderationRouter.use(requireAuth as any);
moderationRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/moderation/actions — Get mod actions
 */
moderationRouter.get('/actions', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const userId = req.query.userId as string;

  const where: any = { guildId };
  if (userId) where.userId = userId;

  const actions = await prisma.modAction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json(actions.map((a) => ({
    ...a,
    type: a.action,
    userTag: a.userId,
    moderatorTag: a.moderatorId,
  })));
}));

/**
 * GET /api/guilds/:guildId/moderation/warnings — Get warnings
 */
moderationRouter.get('/warnings', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const userId = req.query.userId as string;

  const where: any = { guildId };
  if (userId) where.userId = userId;

  const warnings = await prisma.warning.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(warnings.map((w) => ({
    ...w,
    userTag: w.userId,
    moderatorTag: w.moderatorId,
  })));
}));

/**
 * DELETE /api/guilds/:guildId/moderation/warnings/:id — Delete a warning
 */
moderationRouter.delete('/warnings/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.warning.delete({ where: { id: id as string } });
  res.json({ success: true });
}));

/**
 * GET /api/guilds/:guildId/moderation/reaction-roles — Get reaction roles
 */
moderationRouter.get('/reaction-roles', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const reactionRoles = await prisma.reactionRole.findMany({
    where: { guildId },
  });

  res.json(reactionRoles);
}));

/**
 * DELETE /api/guilds/:guildId/moderation/reaction-roles/:id — Delete a reaction role
 */
moderationRouter.delete('/reaction-roles/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.reactionRole.delete({ where: { id: id as string } });
  res.json({ success: true });
}));
