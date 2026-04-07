/**
 * roleCreate event — Logs role creation to audit log.
 */
import { Events, Role, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';
import { sendAudit } from '../modules/audit/auditLogger';

export default {
  name: Events.GuildRoleCreate,
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
        .setColor(role.color || 0x57f287)
        .setTitle('Rol creado')
        .addFields(
          { name: 'Nombre', value: role.name, inline: true },
          { name: 'Color', value: role.hexColor, inline: true },
          { name: 'Mencionable', value: role.mentionable ? 'Si' : 'No', inline: true },
          { name: 'Separado', value: role.hoist ? 'Si' : 'No', inline: true },
        )
        .setFooter({ text: `ID del rol: ${role.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
        await sendAudit(role.guild.id, embed, client, logChannelId);
    } catch (err) {
      logger.error(`[Logging] Error in roleCreate: ${err}`);
    }
  },
};
