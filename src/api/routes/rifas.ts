import { Response } from 'express';
import { createGuildRouter, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';
import { filledCount } from '../../bot/modules/rifa/rifaManager';

export const rifasRouter = createGuildRouter();

// ── GET /rifas — list rifas ──────────────────────────────────
rifasRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params["guildId"] as string;
  const status  = req.query.status as string | undefined;
  const take    = Math.min(parseInt(req.query.limit as string || '30'), 100);

  const where: any = { guildId };
  if (status === 'active')    { where.ended = false; where.cancelled = false; }
  else if (status === 'ended')     where.ended = true;
  else if (status === 'cancelled') where.cancelled = true;

  const rifas = await prisma.rifa.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });

  res.json(rifas.map(r => ({
    ...r,
    filledCount: filledCount(r.participants),
  })));
}));

// ── GET /rifas/config — rifa config ─────────────────────────
rifasRouter.get('/config', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params["guildId"] as string;
  const cfg = await prisma.guildConfig.findUnique({ where: { id: guildId } });
  res.json({
    rifaEnabled:        cfg?.rifaEnabled ?? true,
    rifaCategoryId:     cfg?.rifaCategoryId ?? '1489245171953434805',
    rifaPanelChannelId: cfg?.rifaPanelChannelId ?? null,
    rifaPanelMessageId: cfg?.rifaPanelMessageId ?? null,
    rifaLogChannelId:   cfg?.rifaLogChannelId ?? null,
    rifaStaffRoleIds:   cfg?.rifaStaffRoleIds ?? [],
  });
}));

// ── PATCH /rifas/config — update rifa config ─────────────────
rifasRouter.patch('/config', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params["guildId"] as string;
  const allowed = ['rifaEnabled', 'rifaCategoryId', 'rifaPanelChannelId', 'rifaLogChannelId', 'rifaStaffRoleIds'];
  const data: any = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  const cfg = await prisma.guildConfig.upsert({
    where:  { id: guildId },
    create: { id: guildId, ...data },
    update: data,
  });

  res.json({
    rifaEnabled:        cfg.rifaEnabled,
    rifaCategoryId:     cfg.rifaCategoryId,
    rifaPanelChannelId: cfg.rifaPanelChannelId,
    rifaLogChannelId:   cfg.rifaLogChannelId,
    rifaStaffRoleIds:   cfg.rifaStaffRoleIds,
  });
}));

// ── POST /rifas/deploy-panel — deploy button panel ───────────
rifasRouter.post('/deploy-panel', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId   = req.params["guildId"] as string;
  const { channelId, title, description, buttonLabel, buttonColor } = req.body;

  if (!channelId) {
    res.status(400).json({ error: 'channelId es requerido' });
    return;
  }

  const TOKEN = process.env.BOT_TOKEN;
  if (!TOKEN) { res.status(500).json({ error: 'BOT_TOKEN no configurado' }); return; }

  const cfg = await prisma.guildConfig.findUnique({ where: { id: guildId } });
  const categoryId = cfg?.rifaCategoryId ?? '1489245171953434805';

  const embedTitle = title || '🎟️ Rifas — Soporte';
  const embedDesc  = description || 'Haz clic en el botón para solicitar tu número de rifa.\nEl staff te atenderá en un canal privado.';
  const btnLabel   = buttonLabel || '🎫 Solicitar número de rifa';
  const btnStyle   = buttonColor || 3; // 1=Primary(blue) 2=Secondary 3=Success(green) 4=Danger

  // Build message payload
  const payload = {
    embeds: [{
      title: embedTitle,
      description: embedDesc,
      color: 0xe91e8c,
      footer: { text: 'Vapiano Bot | Sistema de Rifas' },
      timestamp: new Date().toISOString(),
    }],
    components: [{
      type: 1,
      components: [{
        type: 2,
        style: btnStyle,
        label: btnLabel,
        custom_id: `rifa_panel_ticket_${guildId}_${categoryId}`,
      }],
    }],
  };

  // Delete previous panel message if exists
  if (cfg?.rifaPanelChannelId && cfg?.rifaPanelMessageId) {
    await fetch(
      `https://discord.com/api/v10/channels/${cfg.rifaPanelChannelId}/messages/${cfg.rifaPanelMessageId}`,
      { method: 'DELETE', headers: { Authorization: `Bot ${TOKEN}` } }
    ).catch(() => {});
  }

  const discordRes = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!discordRes.ok) {
    const err = await discordRes.json().catch(() => ({}));
    res.status(400).json({ error: 'Error al enviar el panel a Discord', details: err });
    return;
  }

  const msg: any = await discordRes.json();

  // Save channel + message ID
  await prisma.guildConfig.upsert({
    where:  { id: guildId },
    create: { id: guildId, rifaPanelChannelId: channelId, rifaPanelMessageId: msg.id },
    update: { rifaPanelChannelId: channelId, rifaPanelMessageId: msg.id },
  });

  res.json({ success: true, messageId: msg.id, channelId });
}));

// ── POST /rifas/:id/sortear — draw winners ───────────────────
rifasRouter.post('/:id/sortear', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params["guildId"] as string;
  const id = req.params["id"] as string;

  const rifa = await prisma.rifa.findFirst({ where: { id, guildId } });
  if (!rifa) { res.status(404).json({ error: 'Rifa no encontrada' }); return; }
  if (rifa.ended || rifa.cancelled) { res.status(400).json({ error: 'La rifa ya finalizó o fue cancelada' }); return; }

  const real = rifa.participants.filter(p => p !== '');
  const shuffled = [...real].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, Math.min(rifa.winnersCount, shuffled.length));

  const updated = await prisma.rifa.update({
    where: { id },
    data: { ended: true, winnerIds: winners, updatedAt: new Date() },
  });

  res.json({ ...updated, filledCount: filledCount(updated.participants) });
}));

// ── DELETE /rifas/:id — cancel rifa ─────────────────────────
rifasRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params["guildId"] as string;
  const id = req.params["id"] as string;

  const rifa = await prisma.rifa.findFirst({ where: { id, guildId } });
  if (!rifa) { res.status(404).json({ error: 'Rifa no encontrada' }); return; }

  await prisma.rifa.update({
    where: { id },
    data: { cancelled: true, updatedAt: new Date() },
  });

  res.json({ success: true });
}));
