import { Client, VoiceChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

export type StatType = 'members' | 'online' | 'bots' | 'humans' | 'roles' | 'channels' | 'boosts';

interface StatChannel { id: string; channelId: string; type: StatType; format: string; }

function getCount(type: StatType, guild: any): number {
  switch (type) {
    case 'members':  return guild.memberCount;
    case 'humans':   return guild.members.cache.filter((m: any) => !m.user.bot).size;
    case 'bots':     return guild.members.cache.filter((m: any) => m.user.bot).size;
    case 'online':   return guild.members.cache.filter((m: any) => m.presence?.status !== 'offline' && !m.user.bot).size;
    case 'roles':    return guild.roles.cache.size;
    case 'channels': return guild.channels.cache.size;
    case 'boosts':   return guild.premiumSubscriptionCount ?? 0;
    default:         return 0;
  }
}

export async function updateStatsChannels(client: Client): Promise<void> {
  const configs = await prisma.guildConfig.findMany({
    select: { id: true, statsChannels: true },
  });

  for (const config of configs) {
    const guild = client.guilds.cache.get(config.id);
    if (!guild) continue;

    await guild.members.fetch().catch(() => null);

    if (!config.statsChannels) continue;
    const channels = (config.statsChannels as unknown) as StatChannel[];
    for (const stat of channels) {
      const ch = guild.channels.cache.get(stat.channelId) as VoiceChannel | undefined;
      if (!ch) continue;
      const count = getCount(stat.type, guild);
      const name = stat.format.replace('{count}', String(count));
      if (ch.name !== name) {
        await ch.setName(name).catch((err) =>
          logger.warn(`[Stats] Failed to update channel ${stat.channelId}: ${err}`),
        );
      }
    }
  }
}

export function startStatsTimer(client: Client): void {
  logger.info('[Stats] Stats channels timer started (10 min interval)');
  updateStatsChannels(client).catch(() => null);
  setInterval(() => updateStatsChannels(client).catch(() => null), 10 * 60 * 1000);
}
