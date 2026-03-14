/**
 * guildBanAdd event — Logs bans (including external ones not done via the bot).
 */
import { Events, GuildBan, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildBanAdd,
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
        .setColor(0xed4245)
        .setTitle('Member Banned')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${user.username} (<@${user.id}>)`, inline: true },
          { name: 'Reason', value: ban.reason || 'No reason provided', inline: true },
        )
        .setFooter({ text: `User ID: ${user.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in guildBanAdd: ${err}`);
    }
  },
};
