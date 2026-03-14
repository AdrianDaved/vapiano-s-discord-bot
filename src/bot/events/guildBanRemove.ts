/**
 * guildBanRemove event — Logs unbans.
 */
import { Events, GuildBan, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildBanRemove,
  async execute(ban: GuildBan, client: BotClient) {
    const { guild, user } = ban;

    const config = await getGuildConfig(guild.id);
    if (!config.loggingEnabled && !config.modLogChannelId) return;

    const logChannelId = config.modLogChannelId || config.auditLogChannelId;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Member Unbanned')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${user.username} (<@${user.id}>)`, inline: true },
        )
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in guildBanRemove: ${err}`);
    }
  },
};
