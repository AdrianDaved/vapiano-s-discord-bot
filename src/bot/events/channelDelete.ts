/**
 * channelDelete event — Logs channel deletion to audit log.
 */
import { Events, DMChannel, GuildChannel, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

const channelTypeNames: Record<number, string> = {
  [ChannelType.GuildText]: 'Texto',
  [ChannelType.GuildVoice]: 'Voz',
  [ChannelType.GuildCategory]: 'Categoria',
  [ChannelType.GuildAnnouncement]: 'Anuncios',
  [ChannelType.GuildForum]: 'Foro',
  [ChannelType.GuildStageVoice]: 'Escenario',
};

export default {
  name: Events.ChannelDelete,
  async execute(channel: DMChannel | GuildChannel, client: BotClient) {
    if (!('guild' in channel) || !channel.guild) return;

    const config = await getGuildConfig(channel.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = channel.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('Canal eliminado')
        .addFields(
          { name: 'Nombre', value: `#${channel.name}`, inline: true },
          { name: 'Tipo', value: channelTypeNames[channel.type] || 'Desconocido', inline: true },
        )
        .setFooter({ text: `ID del canal: ${channel.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in channelDelete: ${err}`);
    }
  },
};
