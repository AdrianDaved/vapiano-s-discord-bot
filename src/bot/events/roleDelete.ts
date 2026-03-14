/**
 * roleDelete event — Logs role deletion to audit log.
 */
import { Events, Role, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildRoleDelete,
  async execute(role: Role, client: BotClient) {
    if (!role.guild) return;

    const config = await getGuildConfig(role.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = role.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('Role Deleted')
        .addFields(
          { name: 'Name', value: role.name, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Members', value: role.members.size.toString(), inline: true },
        )
        .setFooter({ text: `Role ID: ${role.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in roleDelete: ${err}`);
    }
  },
};
