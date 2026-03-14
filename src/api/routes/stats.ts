import { Router, Response } from 'express';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';
import prisma from '../../database/client';

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

  // Fetch guild info from Discord API using the bot token
  let members = 0;
  let online = 0;
  let channels = 0;
  let roles = 0;

  try {
    const guildRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
      {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }
    );
    if (guildRes.ok) {
      const guildData = await (guildRes as any).json();
      members = guildData.approximate_member_count || 0;
      online = guildData.approximate_presence_count || 0;
    }

    const channelsRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }
    );
    if (channelsRes.ok) {
      const channelsData = await (channelsRes as any).json();
      channels = Array.isArray(channelsData) ? channelsData.length : 0;
    }

    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` },
      }
    );
    if (rolesRes.ok) {
      const rolesData = await (rolesRes as any).json();
      roles = Array.isArray(rolesData) ? rolesData.length : 0;
    }
  } catch {
    // If Discord API fails, just return 0s
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
