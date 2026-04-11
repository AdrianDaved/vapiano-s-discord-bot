import { Response } from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { createGuildRouter, checkGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { ticketPanelCreateSchema, ticketPanelUpdateSchema, ticketUpdateSchema } from '../schemas';
import { buildPanelMessage } from '../../shared/ticketPanelMessage';
import prisma from '../../database/client';

const botRest = () => new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

/**
 * Assert that `channelId` is a text-compatible channel inside `expectedGuildId`
 * from the bot's perspective. Without this, a user with Manage Guild on guild A
 * could pass a channelId belonging to guild B (where the bot is also a member)
 * and the deploy endpoints would happily post there.
 */
async function assertChannelInGuild(channelId: string, expectedGuildId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    const channel = await botRest().get(Routes.channel(channelId)) as { id: string; guild_id?: string; type: number };
    if (!channel.guild_id || channel.guild_id !== expectedGuildId) {
      return { ok: false, status: 403, error: 'Channel does not belong to the target guild' };
    }
    // Text-compatible channel types: 0 (text), 5 (announcement), 11/12 (threads), 15 (forum post target)
    const textLike = new Set([0, 5, 11, 12, 15]);
    if (!textLike.has(channel.type)) {
      return { ok: false, status: 400, error: 'Channel is not a text channel' };
    }
    return { ok: true };
  } catch (err: any) {
    if (err?.status === 404 || err?.rawError?.code === 10003) {
      return { ok: false, status: 404, error: 'Channel not found' };
    }
    if (err?.status === 403 || err?.rawError?.code === 50001) {
      return { ok: false, status: 403, error: 'Bot cannot access this channel' };
    }
    return { ok: false, status: 502, error: 'Failed to verify channel' };
  }
}


/**
 * Re-render the Discord message for a panel group from the latest DB state.
 * Used after a panel update so the buttons/embed in Discord stay in sync.
 */
async function syncDiscordMessage(channelId: string, messageId: string, guildId: string): Promise<void> {
  const siblings = await prisma.ticketPanel.findMany({
    where: { guildId, messageId, channelId },
    orderBy: { createdAt: 'asc' },
  });
  if (siblings.length === 0) return;

  const payload = buildPanelMessage(siblings);
  await botRest().patch(Routes.channelMessage(channelId, messageId), { body: payload });
}

export const ticketsRouter = createGuildRouter();
// ═══════════════════════════════════════════════════════════
// TICKETS — LIST + STATS (literal routes first)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/guilds/:guildId/tickets — List tickets with filters + pagination
 */
ticketsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { status, panelId, userId, claimedBy, priority, page = '1', limit = '50' } = req.query as Record<string, string>;

  const where: any = { guildId };
  if (status) where.status = status;
  if (panelId) where.panelId = panelId;
  if (userId) where.userId = userId;
  if (claimedBy) where.claimedBy = claimedBy;
  if (priority) where.priority = priority;

  const take = Math.min(parseInt(limit) || 50, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { panel: { select: { id: true, name: true, title: true } } },
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: parseInt(page) || 1, pages: Math.ceil(total / take) });
}));

/**
 * GET /api/guilds/:guildId/tickets/stats — Ticket statistics
 */
ticketsRouter.get('/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [open, closed, total, panels, transcripts, thisWeek, avgRatingResult] = await Promise.all([
    prisma.ticket.count({ where: { guildId, status: 'open' } }),
    prisma.ticket.count({ where: { guildId, status: 'closed' } }),
    prisma.ticket.count({ where: { guildId } }),
    prisma.ticketPanel.count({ where: { guildId } }),
    prisma.ticketTranscript.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId, createdAt: { gte: oneWeekAgo } } }),
    prisma.ticket.aggregate({ where: { guildId, rating: { not: null } }, _avg: { rating: true } }),
  ]);

  res.json({
    open,
    closed,
    total,
    panels,
    transcripts,
    thisWeek,
    avgRating: avgRatingResult._avg.rating ? Math.round(avgRatingResult._avg.rating * 10) / 10 : null,
  });
}));

// ═══════════════════════════════════════════════════════════
// PANELS (all literal /panels routes before /:id)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/guilds/:guildId/tickets/panels — List all panels with ticket counts
 */
ticketsRouter.get('/panels', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const panels = await prisma.ticketPanel.findMany({
    where: { guildId },
    include: {
      _count: { select: { tickets: true, transcripts: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(panels);
}));

/**
 * GET /api/guilds/:guildId/tickets/panels/:id — Get single panel
 */
ticketsRouter.get('/panels/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const panel = await prisma.ticketPanel.findFirst({
    where: { id, guildId },
    include: {
      _count: { select: { tickets: true, transcripts: true } },
    },
  });

  if (!panel) {
    res.status(404).json({ error: 'Panel not found' });
    return;
  }

  res.json(panel);
}));

/**
 * POST /api/guilds/:guildId/tickets/panels — Create a panel
 */
ticketsRouter.post('/panels', validate(ticketPanelCreateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const data = req.body;

  // Defaults for optional display fields
  data.title = data.title || 'Support Tickets';
  data.description = data.description || 'Click the button below to create a ticket.';
  data.buttonLabel = data.buttonLabel || 'Create Ticket';
  data.name = data.name || 'Default';

  const panel = await prisma.ticketPanel.create({
    data: { guildId, ...data } as any,
    include: { _count: { select: { tickets: true, transcripts: true } } },
  });

  res.json(panel);
}));

/**
 * PATCH /api/guilds/:guildId/tickets/panels/:id — Update a panel
 */
ticketsRouter.patch('/panels/:id', validate(ticketPanelUpdateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, guildId } = req.params;
  const data = req.body;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const panel = await prisma.ticketPanel.update({
    where: { id: id as string, guildId: guildId as string },
    data,
    include: { _count: { select: { tickets: true, transcripts: true } } },
  });

  // Auto-edit the Discord message if this panel is deployed
  if (panel.messageId && panel.channelId && panel.channelId !== '0') {
    try {
      await syncDiscordMessage(panel.channelId, panel.messageId, guildId as string);
    } catch (syncErr) {
      // Non-fatal: log but don't fail the request
      console.error('[Tickets] Failed to sync Discord message:', syncErr);
    }
  }

  res.json(panel);
}));

/**
 * POST /api/guilds/:guildId/tickets/panels/deploy — Send a multi-button panel message to a channel
 * Body: { channelId, embedTitle, embedDescription, embedColor, panelIds: string[] }
 */
ticketsRouter.post('/panels/deploy', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { channelId, embedTitle, embedDescription, embedColor, panelIds } = req.body;

  if (
    typeof channelId !== 'string' ||
    !/^\d{17,20}$/.test(channelId) ||
    !Array.isArray(panelIds) ||
    panelIds.length === 0 ||
    !panelIds.every((id) => typeof id === 'string')
  ) {
    res.status(400).json({ error: 'channelId (snowflake) and panelIds[] are required' });
    return;
  }
  if (panelIds.length > 5) {
    res.status(400).json({ error: 'Maximum 5 buttons per panel message' });
    return;
  }

  // Verify the channel actually lives in this guild (prevents posting into a
  // channel of a different guild by guessing its id).
  const channelCheck = await assertChannelInGuild(channelId, guildId);
  if (!channelCheck.ok) {
    res.status(channelCheck.status).json({ error: channelCheck.error });
    return;
  }

  const panels = await prisma.ticketPanel.findMany({
    where: { id: { in: panelIds }, guildId },
  });

  if (panels.length === 0) {
    res.status(404).json({ error: 'No panels found' });
    return;
  }

  // Build ordered list matching panelIds order
  const ordered = panelIds.map((id: string) => panels.find((p) => p.id === id)).filter(Boolean) as typeof panels;

  // Build payload using the shared builder so deploy / sync / panelRepost
  // all stay in lockstep.
  const payload = buildPanelMessage(ordered, { embedTitle, embedDescription, embedColor });

  let messageId: string;
  try {
    const msg = await botRest().post(Routes.channelMessages(channelId), { body: payload }) as { id: string };
    messageId = msg.id;
  } catch (err: any) {
    const discordMsg = err?.rawError?.message || err?.message || 'Discord API error';
    res.status(502).json({ error: `No se pudo enviar el mensaje: ${discordMsg}` });
    return;
  }

  // Save messageId to all deployed panels
  await prisma.ticketPanel.updateMany({
    where: { id: { in: ordered.map((p) => p.id) } },
    data: {
      channelId,
      messageId,
      groupEmbedTitle: embedTitle || 'Sistema de Tickets',
      groupEmbedDescription: embedDescription || '',
      groupEmbedColor: embedColor || '#5865F2',
    },
  });

  res.json({ success: true, messageId, channelId, panelCount: ordered.length });
}));


/**
 * POST /api/guilds/:guildId/tickets/panels/:id/sync — Force sync Discord message
 */
ticketsRouter.post('/panels/:id/sync', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, guildId } = req.params;
  const panel = await prisma.ticketPanel.findUnique({ where: { id: id as string, guildId: guildId as string } });
  if (!panel) { res.status(404).json({ error: 'Panel not found' }); return; }
  if (!panel.messageId || !panel.channelId || panel.channelId === '0') {
    res.status(400).json({ error: 'Panel has not been deployed yet' });
    return;
  }
  await syncDiscordMessage(panel.channelId, panel.messageId, guildId as string);
  res.json({ success: true });
}));


/**
 * POST /api/guilds/:guildId/tickets/panels/cross-deploy
 * Copy panels from this guild to another guild and deploy them there
 * Body: { sourcePanelIds, targetGuildId, channelId, embedTitle, embedDescription, embedColor }
 */
ticketsRouter.post('/panels/cross-deploy', asyncHandler(async (req: AuthRequest, res: Response) => {
  const srcGuildId = req.params.guildId as string;
  const { sourcePanelIds, targetGuildId, channelId, embedTitle, embedDescription, embedColor } = req.body;

  // Shape validation
  if (
    typeof targetGuildId !== 'string' ||
    typeof channelId !== 'string' ||
    !Array.isArray(sourcePanelIds) ||
    sourcePanelIds.length === 0 ||
    !sourcePanelIds.every((id) => typeof id === 'string')
  ) {
    res.status(400).json({ error: 'targetGuildId, channelId, and sourcePanelIds[] are required' });
    return;
  }
  // Discord snowflake IDs are 17–20 digits
  const snowflake = /^\d{17,20}$/;
  if (!snowflake.test(targetGuildId) || !snowflake.test(channelId)) {
    res.status(400).json({ error: 'Invalid targetGuildId or channelId' });
    return;
  }
  if (targetGuildId === srcGuildId) {
    res.status(400).json({ error: 'Use the regular deploy endpoint when target guild equals source guild' });
    return;
  }
  if (sourcePanelIds.length > 5) {
    res.status(400).json({ error: 'Maximum 5 buttons per panel message' });
    return;
  }

  // AUTH: user must have Manage Guild on the TARGET guild too, not just the source
  const access = await checkGuildAccess(req.user!, targetGuildId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  // Verify channelId belongs to targetGuildId (not some other guild the bot is in)
  const channelCheck = await assertChannelInGuild(channelId, targetGuildId);
  if (!channelCheck.ok) {
    res.status(channelCheck.status).json({ error: channelCheck.error });
    return;
  }

  // Fetch source panels
  const sourcePanels = await prisma.ticketPanel.findMany({
    where: { id: { in: sourcePanelIds }, guildId: srcGuildId },
  });
  if (sourcePanels.length === 0) {
    res.status(404).json({ error: 'No source panels found' });
    return;
  }

  const ordered = sourcePanelIds
    .map((id: string) => sourcePanels.find((p) => p.id === id))
    .filter(Boolean) as typeof sourcePanels;

  // Create copies in target guild
  const copies = await Promise.all(
    ordered.map((src) =>
      prisma.ticketPanel.create({
        data: {
          guildId: targetGuildId,
          name: src.name,
          channelId,
          title: src.title,
          description: src.description,
          embedColor: src.embedColor,
          footerText: src.footerText,
          buttonLabel: src.buttonLabel,
          buttonEmoji: src.buttonEmoji,
          buttonColor: src.buttonColor,
          style: src.style,
          namingPattern: src.namingPattern,
          ticketLimit: src.ticketLimit,
          mentionStaff: src.mentionStaff,
          mentionCreator: src.mentionCreator,
          welcomeTitle: src.welcomeTitle,
          welcomeMessage: src.welcomeMessage,
          welcomeColor: src.welcomeColor,
          groupEmbedTitle: embedTitle || src.groupEmbedTitle,
          groupEmbedDescription: embedDescription ?? src.groupEmbedDescription,
          groupEmbedColor: embedColor || src.groupEmbedColor,
        },
      })
    )
  );

  // Build the Discord message via the shared builder.
  const payload = buildPanelMessage(copies, { embedTitle, embedDescription, embedColor });

  let msg: { id: string };
  try {
    msg = await botRest().post(Routes.channelMessages(channelId), { body: payload }) as { id: string };
  } catch (err: any) {
    // Roll back the just-created copies so the target guild isn't left with
    // orphan panel rows pointing at a message that never got sent.
    await prisma.ticketPanel.deleteMany({ where: { id: { in: copies.map((c) => c.id) } } });
    const discordMsg = err?.rawError?.message || err?.message || 'Discord API error';
    res.status(502).json({ error: `No se pudo enviar el mensaje: ${discordMsg}` });
    return;
  }

  await prisma.ticketPanel.updateMany({
    where: { id: { in: copies.map((c) => c.id) } },
    data: { messageId: msg.id },
  });

  res.json({ success: true, messageId: msg.id, panelCount: copies.length, targetGuildId });
}));

/**
 * DELETE /api/guilds/:guildId/tickets/panels/:id — Delete a panel
 */
ticketsRouter.delete('/panels/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const panel = await prisma.ticketPanel.findFirst({ where: { id, guildId } });
  if (!panel) {
    res.status(404).json({ error: 'Panel not found' });
    return;
  }
  await prisma.ticketPanel.delete({ where: { id } });
  res.json({ success: true });
}));

// ═══════════════════════════════════════════════════════════
// TRANSCRIPTS (literal /transcripts routes BEFORE /:id)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/guilds/:guildId/tickets/transcripts — List transcripts with pagination
 */
ticketsRouter.get('/transcripts', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { page = '1', limit = '50', userId } = req.query as Record<string, string>;

  const where: any = { guildId };
  if (userId) where.userId = userId;

  const take = Math.min(parseInt(limit) || 50, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const [transcripts, total] = await Promise.all([
    prisma.ticketTranscript.findMany({
      where,
      select: {
        id: true,
        ticketId: true,
        userId: true,
        closedBy: true,
        messageCount: true,
        createdAt: true,
        ticket: { select: { number: true, status: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.ticketTranscript.count({ where }),
  ]);

  res.json({ transcripts, total, page: parseInt(page) || 1, pages: Math.ceil(total / take) });
}));

/**
 * GET /api/guilds/:guildId/tickets/transcripts/:id — Get transcript messages (JSON)
 */
ticketsRouter.get('/transcripts/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const transcript = await prisma.ticketTranscript.findUnique({
    where: { id },
    select: {
      id: true,
      guildId: true,
      ticketId: true,
      userId: true,
      closedBy: true,
      messageCount: true,
      messages: true,
      createdAt: true,
      ticket: { select: { number: true, status: true, userId: true, createdAt: true, closedAt: true } },
    },
  });

  if (!transcript || transcript.guildId !== guildId) {
    res.status(404).json({ error: 'Transcript not found' });
    return;
  }

  res.json(transcript);
}));

/**
 * GET /api/guilds/:guildId/tickets/transcripts/:id/html — Download HTML transcript
 */
ticketsRouter.get('/transcripts/:id/html', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const transcript = await prisma.ticketTranscript.findUnique({
    where: { id },
    select: { id: true, guildId: true, htmlContent: true, ticket: { select: { number: true } } },
  });

  if (!transcript || transcript.guildId !== guildId) {
    res.status(404).json({ error: 'Transcript not found' });
    return;
  }

  if (!transcript.htmlContent) {
    res.status(404).json({ error: 'HTML transcript not available' });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${transcript.ticket?.number || 'unknown'}-transcript.html"`);
  res.send(transcript.htmlContent);
}));

// ═══════════════════════════════════════════════════════════
// SINGLE TICKET (parameterized /:id routes LAST)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/guilds/:guildId/tickets/:id — Get single ticket with panel and transcripts
 */
ticketsRouter.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      panel: { select: { id: true, name: true, title: true } },
      transcripts: {
        select: { id: true, messageCount: true, closedBy: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ticket || ticket.guildId !== guildId) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json(ticket);
}));

/**
 * PATCH /api/guilds/:guildId/tickets/:id — Update ticket (priority, topic, status)
 */
ticketsRouter.patch('/:id', validate(ticketUpdateSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const guildId = req.params.guildId as string;
  const { priority, topic, status } = req.body;

  const data: Record<string, any> = {};
  if (priority !== undefined) data.priority = priority;
  if (topic !== undefined) data.topic = topic;
  if (status !== undefined) {
    data.status = status;
    if (status === 'closed' && !data.closedAt) data.closedAt = new Date();
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing || existing.guildId !== guildId) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { panel: { select: { id: true, name: true, title: true } } },
  });
  res.json(ticket);
}));
