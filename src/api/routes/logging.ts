/**
 * Logging API routes — Manage logging channel configuration.
 */
import { Router, Response } from 'express';
import { createGuildRouter, requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { loggingUpdateSchema } from '../schemas';
import prisma from '../../database/client';

export const loggingRouter = createGuildRouter();
/**
 * GET /api/guilds/:guildId/logging — Get logging configuration
 */
loggingRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const config = await prisma.guildConfig.findUnique({
    where: { id: guildId },
    select: {
      loggingEnabled: true,
      modLogChannelId: true,
      warnLogChannelId: true,
      messageLogChannelId: true,
      joinLeaveLogChannelId: true,
      auditLogChannelId: true,
      voiceLogChannelId: true,
      verificationLogChannelId: true,
    },
  });

  res.json(config || {});
}) as any);

/**
 * PATCH /api/guilds/:guildId/logging — Update logging configuration
 */
loggingRouter.patch('/', validate(loggingUpdateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const data = req.body;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields provided' });
    return;
  }

  // Allow empty strings to clear channel IDs
  for (const key of Object.keys(data)) {
    if (data[key] === '') data[key] = null;
  }

  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId, ...data },
    update: data,
  });

  res.json(config);
}) as any);
