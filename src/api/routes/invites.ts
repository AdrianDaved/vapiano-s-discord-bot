import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

export const invitesRouter = Router({ mergeParams: true });

invitesRouter.use(requireAuth as any);
invitesRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/invites — Get invite stats
 */
invitesRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const invites = await prisma.invite.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(invites);
}));

/**
 * GET /api/guilds/:guildId/invites/leaderboard — Invite leaderboard
 */
invitesRouter.get('/leaderboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const stats = await prisma.invite.groupBy({
    by: ['inviterId'],
    where: { guildId },
    _count: { inviterId: true },
  });

  // Get detailed counts per inviter
  const leaderboard = await Promise.all(
    stats.map(async (s) => {
      const [total, fake, left] = await Promise.all([
        prisma.invite.count({ where: { guildId, inviterId: s.inviterId } }),
        prisma.invite.count({ where: { guildId, inviterId: s.inviterId, fake: true } }),
        prisma.invite.count({ where: { guildId, inviterId: s.inviterId, left: true } }),
      ]);
      return {
        inviterId: s.inviterId,
        total,
        fake,
        left,
        valid: total - fake - left,
      };
    })
  );

  leaderboard.sort((a, b) => b.valid - a.valid);

  res.json(leaderboard);
}));
