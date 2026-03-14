/**
 * channelCreate event — Logs channel creation to audit log.
 */
import { Events, NonThreadGuildBasedChannel, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

const channelTypeNames: Record<number, string> = {
  [ChannelType.GuildText]: 'Text',
  [ChannelType.GuildVoice]: 'Voice',
  [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement',
  [ChannelType.GuildForum]: 'Forum',
  [ChannelType.GuildStageVoice]: 'Stage',
};

export default {
  name: Events.ChannelCreate,
  async execute(channel: NonThreadGuildBasedChannel, client: BotClient) {
    if (!channel.guild) return;

    const config = await getGuildConfig(channel.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = channel.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Channel Created')
        .addFields(
          { name: 'Name', value: `#${channel.name}`, inline: true },
          { name: 'Type', value: channelTypeNames[channel.type] || 'Unknown', inline: true },
          { name: 'Category', value: channel.parent?.name || 'None', inline: true },
        )
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in channelCreate: ${err}`);
    }
  },
};
