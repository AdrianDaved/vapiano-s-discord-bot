import { Router, Response } from 'express';
import { createGuildRouter, requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

export const backupsRouter = createGuildRouter();
/**
 * GET /api/guilds/:guildId/backups — List backups
 */
backupsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const backups = await prisma.backup.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      creatorId: true,
      size: true,
      createdAt: true,
      // Exclude `data` to keep response size small
    },
  });

  res.json(backups);
}));

/**
 * GET /api/guilds/:guildId/backups/:id — Get backup details (including data)
 */
backupsRouter.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const backup = await prisma.backup.findFirst({
    where: { id, guildId },
  });

  if (!backup) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }

  res.json(backup);
}));

/**
 * DELETE /api/guilds/:guildId/backups/:id — Delete a backup
 */
backupsRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const backup = await prisma.backup.findFirst({
    where: { id, guildId },
  });

  if (!backup) {
    res.status(404).json({ error: 'Backup not found' });
    return;
  }

  await prisma.backup.delete({ where: { id } });
  res.json({ success: true });
}));
