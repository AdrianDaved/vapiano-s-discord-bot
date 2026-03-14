import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { ticketPanelCreateSchema, ticketPanelUpdateSchema, ticketUpdateSchema } from '../schemas';
import prisma from '../../database/client';

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
  const { id } = req.params;

  const panel = await prisma.ticketPanel.findUnique({
    where: { id: id as string },
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
  const { id } = req.params;
  const data = req.body;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const panel = await prisma.ticketPanel.update({
    where: { id: id as string },
    data,
    include: { _count: { select: { tickets: true, transcripts: true } } },
  });
  res.json(panel);
}));

/**
 * DELETE /api/guilds/:guildId/tickets/panels/:id — Delete a panel
 */
ticketsRouter.delete('/panels/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  await prisma.ticketPanel.delete({ where: { id: id as string } });
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
  const { id } = req.params;

  const transcript = await prisma.ticketTranscript.findUnique({
    where: { id: id as string },
    select: {
      id: true,
      ticketId: true,
      userId: true,
      closedBy: true,
      messageCount: true,
      messages: true,
      createdAt: true,
      ticket: { select: { number: true, status: true, userId: true, createdAt: true, closedAt: true } },
    },
  });

  if (!transcript) {
    res.status(404).json({ error: 'Transcript not found' });
    return;
  }

  res.json(transcript);
}));

/**
 * GET /api/guilds/:guildId/tickets/transcripts/:id/html — Download HTML transcript
 */
ticketsRouter.get('/transcripts/:id/html', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const transcript = await prisma.ticketTranscript.findUnique({
    where: { id: id as string },
    select: { id: true, htmlContent: true, ticket: { select: { number: true } } },
  });

  if (!transcript) {
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
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: id as string },
    include: {
      panel: { select: { id: true, name: true, title: true } },
      transcripts: {
        select: { id: true, messageCount: true, closedBy: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json(ticket);
}));

/**
 * PATCH /api/guilds/:guildId/tickets/:id — Update ticket (priority, topic, status)
 */
ticketsRouter.patch('/:id', validate(ticketUpdateSchema) as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
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

  const ticket = await prisma.ticket.update({
    where: { id: id as string },
    data,
    include: { panel: { select: { id: true, name: true, title: true } } },
  });
  res.json(ticket);
}));
