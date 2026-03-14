import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import {
  autoResponseCreateSchema,
  autoResponseUpdateSchema,
  scheduledMessageCreateSchema,
  scheduledMessageUpdateSchema,
} from '../schemas';
import prisma from '../../database/client';

export const automationRouter = Router({ mergeParams: true });

automationRouter.use(requireAuth as any);
automationRouter.use(requireGuildAccess as any);

// ─── Auto-Responses ──────────────────────────────────────

/**
 * GET /api/guilds/:guildId/automation/responses — List auto-responses
 */
automationRouter.get('/responses', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const responses = await prisma.autoResponse.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(responses);
}));

/**
 * POST /api/guilds/:guildId/automation/responses — Create auto-response
 */
automationRouter.post('/responses', validate(autoResponseCreateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { trigger, response, matchType, enabled } = req.body;

  const ar = await prisma.autoResponse.create({
    data: {
      guildId,
      trigger,
      response,
      matchType: matchType || 'contains',
      enabled: enabled !== undefined ? enabled : true,
    },
  });

  res.json(ar);
}));

/**
 * PATCH /api/guilds/:guildId/automation/responses/:id — Update auto-response
 */
automationRouter.patch('/responses/:id', validate(autoResponseUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const ar = await prisma.autoResponse.update({ where: { id: id as string }, data: req.body });
  res.json(ar);
}));

/**
 * DELETE /api/guilds/:guildId/automation/responses/:id — Delete auto-response
 */
automationRouter.delete('/responses/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.autoResponse.delete({ where: { id: id as string } });
  res.json({ success: true });
}));

// ─── Scheduled Messages ──────────────────────────────────

/**
 * GET /api/guilds/:guildId/automation/scheduled — List scheduled messages
 */
automationRouter.get('/scheduled', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const messages = await prisma.scheduledMessage.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(messages);
}));

/**
 * POST /api/guilds/:guildId/automation/scheduled — Create scheduled message
 */
automationRouter.post('/scheduled', validate(scheduledMessageCreateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { channelId, message, cron, enabled } = req.body;

  const scheduled = await prisma.scheduledMessage.create({
    data: { guildId, channelId, message, cron, enabled: enabled !== undefined ? enabled : true },
  });

  res.json(scheduled);
}));

/**
 * PATCH /api/guilds/:guildId/automation/scheduled/:id — Update scheduled message
 */
automationRouter.patch('/scheduled/:id', validate(scheduledMessageUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const msg = await prisma.scheduledMessage.update({ where: { id: id as string }, data: req.body });
  res.json(msg);
}));

/**
 * DELETE /api/guilds/:guildId/automation/scheduled/:id — Delete scheduled message
 */
automationRouter.delete('/scheduled/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.scheduledMessage.delete({ where: { id: id as string } });
  res.json({ success: true });
}));

// ─── Polls ───────────────────────────────────────────────

/**
 * GET /api/guilds/:guildId/automation/polls — List polls
 */
automationRouter.get('/polls', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const polls = await prisma.poll.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(polls);
}));
