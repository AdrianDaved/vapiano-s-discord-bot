import { EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../../shared/types';
import logger from '../../../shared/logger';

// Fixed audit log channels per guild
const AUDIT_CHANNELS: Record<string, string> = {
  '1420045220325625898': '1420854487945445499', // Vapiano
  '1107335281620820079': '1483931180423184514', // HubStore
};

/**
 * Send embed to the hardcoded audit channel for this guild.
 * Pass skipChannelId to avoid double-posting when the event already
 * sent to the same channel via a DB-configured log channel.
 */
export async function sendAudit(
  guildId: string,
  embed: EmbedBuilder,
  client: BotClient,
  skipChannelId?: string | null,
): Promise<void> {
  const channelId = AUDIT_CHANNELS[guildId];
  if (!channelId) return;
  // Skip if the event already sent to this exact channel
  if (skipChannelId && skipChannelId === channelId) return;

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const ch = (guild.channels.cache.get(channelId)
      ?? await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;

    if (!ch) {
      logger.warn(`[Audit] Channel ${channelId} not found for guild ${guildId}`);
      return;
    }

    await ch.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`[Audit] Failed to send to guild ${guildId}: ${err}`);
  }
}
