/**
 * Sticky Messages API routes — Manage sticky message configurations.
 */
import { Router, Response } from 'express';
import { createGuildRouter, requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { stickyCreateSchema, stickyUpdateSchema } from '../schemas';
import prisma from '../../database/client';

export const stickyRouter = createGuildRouter();
/**
 * GET /api/guilds/:guildId/sticky — List all sticky messages
 */
stickyRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const stickies = await prisma.stickyMessage.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(stickies);
}) as any);

/**
 * GET /api/guilds/:guildId/sticky/:channelId — Get sticky for a specific channel
 */
stickyRouter.get('/:channelId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const channelId = req.params.channelId as string;

  const sticky = await prisma.stickyMessage.findFirst({
    where: { guildId, channelId },
  });

  if (!sticky) {
    res.status(404).json({ error: 'No sticky message in this channel' });
    return;
  }

  res.json(sticky);
}) as any);

/**
 * POST /api/guilds/:guildId/sticky — Create or update a sticky message
 */
stickyRouter.post('/', validate(stickyCreateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { channelId, title, description, color, enabled } = req.body;
  const userId = (req as any).user?.id || 'dashboard';

  const sticky = await prisma.stickyMessage.upsert({
    where: { channelId },
    create: {
      guildId,
      channelId,
      title: title || null,
      description,
      color: color || '#5865F2',
      enabled: enabled !== false,
      createdBy: userId,
    },
    update: {
      title: title || null,
      description,
      color: color || '#5865F2',
      enabled: enabled !== false,
    },
  });

  res.json(sticky);
}) as any);

/**
 * PATCH /api/guilds/:guildId/sticky/:channelId — Update a sticky message
 */
stickyRouter.patch('/:channelId', validate(stickyUpdateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const channelId = req.params.channelId as string;

  const sticky = await prisma.stickyMessage.findFirst({
    where: { guildId, channelId },
  });

  if (!sticky) {
    res.status(404).json({ error: 'No sticky message in this channel' });
    return;
  }

  const updated = await prisma.stickyMessage.update({
    where: { id: sticky.id },
    data: req.body,
  });

  res.json(updated);
}) as any);

/**
 * DELETE /api/guilds/:guildId/sticky/:channelId — Delete a sticky message
 */
stickyRouter.delete('/:channelId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const channelId = req.params.channelId as string;

  const sticky = await prisma.stickyMessage.findFirst({
    where: { guildId, channelId },
  });

  if (!sticky) {
    res.status(404).json({ error: 'No sticky message in this channel' });
    return;
  }

  await prisma.stickyMessage.delete({ where: { id: sticky.id } });
  res.json({ success: true });
}) as any);
