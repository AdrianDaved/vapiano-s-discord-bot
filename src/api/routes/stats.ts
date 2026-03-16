import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

// Cache Discord guild stats for 3 minutes to avoid repeated API calls on every page load
const discordStatsCache = new Map<string, { data: any; expiresAt: number }>();
const DISCORD_CACHE_TTL = 3 * 60 * 1000;

async function getDiscordStats(guildId: string) {
  const cached = discordStatsCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const headers = { Authorization: `Bot ${process.env.BOT_TOKEN}` };

  const [guildRes, channelsRes, rolesRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, { headers }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers }),
  ]);

  const [guildData, channelsData, rolesData]: any[] = await Promise.all([
    guildRes.ok ? guildRes.json() : null,
    channelsRes.ok ? channelsRes.json() : null,
    rolesRes.ok ? rolesRes.json() : null,
  ]);

  const result = {
    members: guildData?.approximate_member_count || 0,
    online: guildData?.approximate_presence_count || 0,
    channels: Array.isArray(channelsData) ? channelsData.length : 0,
    roles: Array.isArray(rolesData) ? rolesData.length : 0,
  };

  discordStatsCache.set(guildId, { data: result, expiresAt: Date.now() + DISCORD_CACHE_TTL });
  return result;
}

export const statsRouter = Router({ mergeParams: true });

statsRouter.use(requireAuth as any);
statsRouter.use(requireGuildAccess as any);

/**
 * GET /api/guilds/:guildId/stats — Get guild statistics overview
 * Returns flat fields that match what Dashboard.tsx expects
 */
statsRouter.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const guildId = req.params.guildId as string;

  const [
    totalInvites,
    validInvites,
    fakeInvites,
    leftInvites,
    totalWarnings,
    totalModActions,
    openTickets,
    closedTickets,
    totalLeveledUsers,
    totalAutoResponses,
    totalScheduledMessages,
    totalPolls,
    totalBackups,
    totalReputation,
    totalGiveaways,
    totalSuggestions,
    recentModActions,
  ] = await Promise.all([
    prisma.invite.count({ where: { guildId } }),
    prisma.invite.count({ where: { guildId, fake: false, left: false } }),
    prisma.invite.count({ where: { guildId, fake: true } }),
    prisma.invite.count({ where: { guildId, left: true } }),
    prisma.warning.count({ where: { guildId } }),
    prisma.modAction.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId, status: 'open' } }),
    prisma.ticket.count({ where: { guildId, status: 'closed' } }),
    prisma.userLevel.count({ where: { guildId } }),
    prisma.autoResponse.count({ where: { guildId } }),
    prisma.scheduledMessage.count({ where: { guildId } }),
    prisma.poll.count({ where: { guildId } }),
    prisma.backup.count({ where: { guildId } }),
    prisma.reputation.count({ where: { guildId } }),
    prisma.giveaway.count({ where: { guildId } }),
    prisma.suggestion.count({ where: { guildId } }),
    prisma.modAction.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Fetch Discord stats (cached 3 min to avoid rate limits and latency on every load)
  let members = 0, online = 0, channels = 0, roles = 0;
  try {
    ({ members, online, channels, roles } = await getDiscordStats(guildId));
  } catch {
    // If Discord API fails, return 0s
  }

  // Return flat shape matching Dashboard.tsx expectations
  res.json({
    members,
    online,
    channels,
    roles,
    totalInvites,
    validInvites,
    fakeInvites,
    leftInvites,
    modActions: totalModActions,
    warnings: totalWarnings,
    openTickets,
    closedTickets,
    activeLeveling: totalLeveledUsers,
    autoResponses: totalAutoResponses,
    scheduledMessages: totalScheduledMessages,
    polls: totalPolls,
    backups: totalBackups,
    reputation: totalReputation,
    giveaways: totalGiveaways,
    suggestions: totalSuggestions,
    recentModActions,
  });
}));
