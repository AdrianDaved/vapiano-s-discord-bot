/**
 * channelCreate event — Logs channel creation to audit log.
 */
import { Events, NonThreadGuildBasedChannel, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';
import { sendAudit } from '../modules/audit/auditLogger';

const channelTypeNames: Record<number, string> = {
  [ChannelType.GuildText]: 'Texto',
  [ChannelType.GuildVoice]: 'Voz',
  [ChannelType.GuildCategory]: 'Categoria',
  [ChannelType.GuildAnnouncement]: 'Anuncios',
  [ChannelType.GuildForum]: 'Foro',
  [ChannelType.GuildStageVoice]: 'Escenario',
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
        .setTitle('Canal creado')
        .addFields(
          { name: 'Nombre', value: `#${channel.name}`, inline: true },
          { name: 'Tipo', value: channelTypeNames[channel.type] || 'Desconocido', inline: true },
          { name: 'Categoria', value: channel.parent?.name || 'Ninguna', inline: true },
        )
        .setFooter({ text: `ID del canal: ${channel.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
        await sendAudit(channel.guild.id, embed, client, logChannelId);
    } catch (err) {
      logger.error(`[Logging] Error in channelCreate: ${err}`);
    }
  },
};
