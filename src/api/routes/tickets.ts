import { Router, Response } from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { ticketPanelCreateSchema, ticketPanelUpdateSchema, ticketUpdateSchema } from '../schemas';
import prisma from '../../database/client';

const BUTTON_STYLE: Record<string, number> = {
  Primary: 1, Secondary: 2, Success: 3, Danger: 4,
  primary: 1, secondary: 2, success: 3, danger: 4,
};

export const ticketsRouter = Router({ mergeParams: true });

ticketsRouter.use(requireAuth as any);
ticketsRouter.use(requireGuildAccess as any);

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
ticketsRouter.post('/panels', validate(ticketPanelCreateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
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
ticketsRouter.patch('/panels/:id', validate(ticketPanelUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
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
  res.json(panel);
}));

/**
 * POST /api/guilds/:guildId/tickets/panels/deploy — Send a multi-button panel message to a channel
 * Body: { channelId, embedTitle, embedDescription, embedColor, panelIds: string[] }
 */
ticketsRouter.post('/panels/deploy', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;
  const { channelId, embedTitle, embedDescription, embedColor, panelIds } = req.body;

  if (!channelId || !Array.isArray(panelIds) || panelIds.length === 0) {
    res.status(400).json({ error: 'channelId and at least one panelId are required' });
    return;
  }
  if (panelIds.length > 5) {
    res.status(400).json({ error: 'Maximum 5 buttons per panel message' });
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

  // Parse embed color
  const colorHex = (embedColor || '#5865F2').replace('#', '');
  const colorInt = parseInt(colorHex, 16) || 0x5865f2;

  // Build Discord message payload
  const buttons = ordered.map((p) => {
    const style = BUTTON_STYLE[p.buttonColor] ?? 1;
    const component: Record<string, unknown> = {
      type: 2,
      style,
      label: p.buttonLabel || p.name,
      custom_id: `ticket_create_${p.id}`,
    };
    if (p.buttonEmoji) {
      // Custom emoji format: <:name:id> or unicode
      const customMatch = p.buttonEmoji.match(/^<a?:(\w+):(\d+)>$/);
      if (customMatch) {
        component.emoji = { name: customMatch[1], id: customMatch[2] };
      } else {
        component.emoji = { name: p.buttonEmoji };
      }
    }
    return component;
  });

  const payload: Record<string, unknown> = {
    embeds: [
      {
        title: embedTitle || 'Sistema de Tickets',
        description: embedDescription || 'Selecciona el botón que corresponda a tu caso.',
        color: colorInt,
      },
    ],
    components: [{ type: 1, components: buttons }],
  };

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  let messageId: string;
  try {
    const msg = await rest.post(Routes.channelMessages(channelId), { body: payload }) as { id: string };
    messageId = msg.id;
  } catch (err: any) {
    const discordMsg = err?.rawError?.message || err?.message || 'Discord API error';
    res.status(502).json({ error: `No se pudo enviar el mensaje: ${discordMsg}` });
    return;
  }

  // Save messageId to all deployed panels
  await prisma.ticketPanel.updateMany({
    where: { id: { in: ordered.map((p) => p.id) } },
    data: { channelId, messageId },
  });

  res.json({ success: true, messageId, channelId, panelCount: ordered.length });
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
ticketsRouter.patch('/:id', validate(ticketUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
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
