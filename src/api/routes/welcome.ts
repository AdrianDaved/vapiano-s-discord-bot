/**
 * Welcome/Farewell API routes — Manage welcome and farewell settings.
 */
import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { welcomeUpdateSchema } from '../schemas';
import prisma from '../../database/client';

export const welcomeRouter = Router({ mergeParams: true });

welcomeRouter.use(requireAuth as any);
welcomeRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/welcome — Get welcome/farewell settings
 */
welcomeRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const config = await prisma.guildConfig.findUnique({
    where: { id: guildId },
    select: {
      welcomeEnabled: true,
      welcomeChannelId: true,
      welcomeMessage: true,
      welcomeImageEnabled: true,
      farewellEnabled: true,
      farewellChannelId: true,
      farewellMessage: true,
      joinRoleIds: true,
    },
  });

  res.json(config || {});
}) as any);

/**
 * PATCH /api/guilds/:guildId/welcome — Update welcome/farewell settings
 */
welcomeRouter.patch('/', validate(welcomeUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
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
 * POST /api/guilds/:guildId/welcome/test — Send a test welcome message (placeholder)
 */
welcomeRouter.post('/test', asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Test message sent (bot integration pending)' });
}) as any);
