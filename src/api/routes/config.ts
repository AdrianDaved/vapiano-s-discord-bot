import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest, fetchUserGuilds } from '../middleware/auth';
import { asyncHandler, validate } from '../middleware/validate';
import { configUpdateSchema } from '../schemas';
import prisma from '../../database/client';

// Fields grouped by section for cloning
const CLONE_SECTIONS: Record<string, string[]> = {
  general: ['prefix', 'language', 'muteRoleId', 'ticketStaffRoleIds', 'ticketCategoryId', 'ticketLogChannelId', 'ticketCounter'],
  welcome: ['welcomeEnabled', 'joinMessage', 'joinChannelId', 'joinRoleIds', 'leaveMessage', 'leaveChannelId', 'joinDmMessage', 'joinDmEnabled'],
  logging: ['loggingEnabled', 'logChannelId', 'logEvents'],
  automod: ['autoModEnabled', 'antiSpamEnabled', 'maxMentions', 'maxMessages', 'antiLinkEnabled', 'allowedLinks', 'antiCapsEnabled', 'capsThreshold', 'capsMinLength', 'badWordsEnabled', 'badWords', 'antiRaidEnabled', 'raidThreshold', 'autoModLogChannelId', 'autoModIgnoredRoles', 'autoModIgnoredChannels'],
  leveling: ['levelingEnabled', 'xpPerMessage', 'xpCooldown', 'xpMultiplier', 'levelUpMessage', 'levelUpChannelId', 'levelingIgnoredRoles', 'levelingIgnoredChannels', 'noXpRoles'],
  moderation: ['modLogChannelId', 'modLogEnabled'],
  suggestions: ['suggestionsEnabled', 'suggestionChannelId', 'suggestionLogChannelId'],
  reputation: ['reputationEnabled', 'repChannelId'],
};

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

  if (!targetGuildId || !Array.isArray(sections) || sections.length === 0) {
    res.status(400).json({ error: 'targetGuildId y sections son requeridos' });
    return;
  }

  // Verify user has access to target guild
  const userGuilds = await fetchUserGuilds(req.user!.id, req.user!.accessToken);
  const targetGuild = userGuilds?.find((g: any) => g.id === targetGuildId);
  if (!targetGuild) {
    res.status(403).json({ error: 'No tienes acceso al servidor destino' });
    return;
  }
  const perms = BigInt(targetGuild.permissions);
  if (!targetGuild.owner && (perms & BigInt(0x20)) === BigInt(0) && (perms & BigInt(0x8)) === BigInt(0)) {
    res.status(403).json({ error: 'No tienes permisos de gestión en el servidor destino' });
    return;
  }

  // Get source config
  const source = await prisma.guildConfig.findUnique({ where: { id: sourceGuildId } });
  if (!source) {
    res.status(404).json({ error: 'Configuración origen no encontrada' });
    return;
  }

  // Build data to copy based on selected sections
  const data: Record<string, any> = {};
  for (const section of sections) {
    const fields = CLONE_SECTIONS[section] || [];
    for (const field of fields) {
      if ((source as any)[field] !== undefined) {
        data[field] = (source as any)[field];
      }
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No hay campos para clonar' });
    return;
  }

  // Remove fields that should not be cloned (IDs specific to source guild)
  const excludeFields = ['ticketCounter'];
  for (const f of excludeFields) delete data[f];

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
