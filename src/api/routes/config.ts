import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, checkGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { configUpdateSchema } from '../schemas';
import prisma from '../../database/client';

// Fields grouped by section for cloning — matched to actual GuildConfig schema fields.
// `as const` gives us a literal-typed array we can derive the section enum from
// and Zod-validate against at runtime.
const CLONE_SECTIONS = {
  general: ['prefix', 'language', 'muteRoleId'],
  welcome: [
    'welcomeEnabled', 'welcomeChannelId', 'welcomeMessage', 'welcomeImageEnabled',
    'farewellEnabled', 'farewellChannelId', 'farewellMessage',
    'joinRoleIds',
  ],
  logging: [
    'loggingEnabled', 'modLogChannelId', 'warnLogChannelId', 'messageLogChannelId',
    'joinLeaveLogChannelId', 'auditLogChannelId', 'voiceLogChannelId',
  ],
  automod: [
    'automodEnabled', 'antiSpamEnabled', 'antiSpamThreshold', 'antiSpamInterval',
    'antiCapsEnabled', 'antiCapsThreshold', 'antiCapsMinLength',
    'antiLinksEnabled', 'antiLinksWhitelist',
    'blacklistedWords', 'automodExemptRoleIds', 'automodExemptChannelIds',
  ],
  moderation: ['modLogChannelId', 'warnLogChannelId', 'muteRoleId'],
  suggestions: ['suggestionsEnabled', 'suggestionsChannelId'],
  reputation: ['reputationEnabled', 'repChannelId'],
  tickets: [
    'ticketsEnabled', 'ticketCategoryId', 'ticketLogChannelId',
    'ticketStaffRoleIds', 'ticketTranscriptChannelId',
    'ticketCloseConfirmation', 'ticketDMTranscript',
  ],
} as const satisfies Record<string, readonly string[]>;

type CloneSection = keyof typeof CLONE_SECTIONS;
const VALID_SECTIONS = new Set<string>(Object.keys(CLONE_SECTIONS));
// Fields that must never be copied from source to target (source-specific state)
const EXCLUDED_FIELDS = new Set<string>(['ticketCounter']);

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
/**
 * POST /api/guilds/:guildId/config/clone — Clone config sections to another guild
 * Body: { targetGuildId: string, sections: string[] }
 */
configRouter.post('/clone', asyncHandler(async (req: AuthRequest, res: Response) => {
  const sourceGuildId = req.params.guildId as string;
  const { targetGuildId, sections } = req.body;

  // Strict input validation
  if (
    typeof targetGuildId !== 'string' ||
    !/^\d{17,20}$/.test(targetGuildId) ||
    !Array.isArray(sections) ||
    sections.length === 0 ||
    !sections.every((s: unknown): s is CloneSection => typeof s === 'string' && VALID_SECTIONS.has(s))
  ) {
    res.status(400).json({
      error: 'targetGuildId (snowflake) and sections[] are required; sections must be one of: ' + [...VALID_SECTIONS].join(', '),
    });
    return;
  }
  if (targetGuildId === sourceGuildId) {
    res.status(400).json({ error: 'Source and target guild must be different' });
    return;
  }

  // Reuse the same access check as the middleware
  const access = await checkGuildAccess(req.user!, targetGuildId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const source = await prisma.guildConfig.findUnique({ where: { id: sourceGuildId } });
  if (!source) {
    res.status(404).json({ error: 'Configuración origen no encontrada' });
    return;
  }

  // Build data to copy based on selected sections. Every field name is known
  // at compile-time via CLONE_SECTIONS, so no untrusted key lookups.
  const data: Record<string, unknown> = {};
  for (const section of sections as CloneSection[]) {
    for (const field of CLONE_SECTIONS[section]) {
      if (EXCLUDED_FIELDS.has(field)) continue;
      const value = (source as unknown as Record<string, unknown>)[field];
      if (value !== undefined) data[field] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No hay campos para clonar' });
    return;
  }

  await prisma.guildConfig.upsert({
    where: { id: targetGuildId },
    create: { id: targetGuildId, ...data },
    update: data,
  });

  res.json({ success: true, cloned: Object.keys(data).length, targetGuildId });
}) as any);

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
