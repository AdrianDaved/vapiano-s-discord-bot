/**
 * Reaction Roles API routes — Manage reaction/button role configurations.
 */
import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { reactionRoleCreateSchema, reactionRoleUpdateSchema } from '../schemas';
import prisma from '../../database/client';

export const reactionRolesRouter = Router({ mergeParams: true });

reactionRolesRouter.use(requireAuth as any);
reactionRolesRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/reactionroles — List all reaction role configs
 */
reactionRolesRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const roles = await prisma.reactionRole.findMany({
    where: { guildId },
    orderBy: { messageId: 'asc' },
  });

  res.json(roles);
}) as any);

/**
 * POST /api/guilds/:guildId/reactionroles — Create a new reaction role
 */
reactionRolesRouter.post('/', validate(reactionRoleCreateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { channelId, messageId, emoji, roleId, type } = req.body;

  try {
    const rr = await prisma.reactionRole.create({
      data: { guildId, channelId, messageId, emoji, roleId, type },
    });
    res.status(201).json(rr);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A reaction role for this message+emoji already exists' });
      return;
    }
    throw err;
  }
}) as any);

/**
 * DELETE /api/guilds/:guildId/reactionroles/:id — Delete a reaction role
 */
reactionRolesRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const id = req.params.id as string;

  const rr = await prisma.reactionRole.findFirst({ where: { id, guildId } });

  if (!rr) {
    res.status(404).json({ error: 'Reaction role not found' });
    return;
  }

  await prisma.reactionRole.delete({ where: { id } });
  res.json({ success: true });
}) as any);

/**
 * PATCH /api/guilds/:guildId/reactionroles/:id — Update a reaction role
 */
reactionRolesRouter.patch('/:id', validate(reactionRoleUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const id = req.params.id as string;

  const rr = await prisma.reactionRole.findFirst({ where: { id, guildId } });

  if (!rr) {
    res.status(404).json({ error: 'Reaction role not found' });
    return;
  }

  const updated = await prisma.reactionRole.update({
    where: { id },
    data: req.body,
  });

  res.json(updated);
}) as any);
