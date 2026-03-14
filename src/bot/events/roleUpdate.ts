/**
 * roleUpdate event — Logs role changes to audit log.
 */
import { Events, Role, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildRoleUpdate,
  async execute(oldRole: Role, newRole: Role, client: BotClient) {
    if (!newRole.guild) return;

    const config = await getGuildConfig(newRole.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = newRole.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const changes: string[] = [];

      if (oldRole.name !== newRole.name) {
        changes.push(`**Name:** \`${oldRole.name}\` → \`${newRole.name}\``);
      }
      if (oldRole.color !== newRole.color) {
        changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hoisted:** ${oldRole.hoist} → ${newRole.hoist}`);
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes.push(`**Permissions changed**`);
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setColor(newRole.color || 0xfee75c)
        .setTitle('Role Updated')
        .addFields(
          { name: 'Role', value: `${newRole.toString()} (${newRole.name})`, inline: true },
          { name: 'Changes', value: changes.join('\n') },
        )
        .setFooter({ text: `Role ID: ${newRole.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in roleUpdate: ${err}`);
    }
  },
};
