import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { configUpdateSchema } from '../schemas';
import prisma from '../../database/client';

export const configRouter = Router({ mergeParams: true });

configRouter.use(requireAuth as any);
configRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/config — Get guild configuration
 */
configRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId },
    update: {},
  });

  res.json(config);
}) as any);

/**
 * PATCH /api/guilds/:guildId/config — Update guild configuration
 * Body is validated against configUpdateSchema (Zod).
 */
configRouter.patch('/', validate(configUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  // req.body is already validated and stripped of unknown fields by zod .strict()
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
