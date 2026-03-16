import { Events, Message, EmbedBuilder, TextChannel, PartialMessage } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';
import { addDeletedMessage } from '../modules/utility/snipeCache';

export default {
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage, client: BotClient) {
    if (!message.guild || message.author?.bot) return;

    // Cache for /snipe command (before any early returns)
    if (message.author && (message.content || message.attachments.size > 0)) {
      addDeletedMessage(message.channelId, {
        authorId: message.author.id,
        authorTag: message.author.username,
        authorAvatar: message.author.displayAvatarURL(),
        content: message.content || '',
        attachmentUrl: message.attachments.first()?.url ?? null,
        deletedAt: new Date(),
      });
    }

    const config = await getGuildConfig(message.guild.id);
    if (!config.messageLogChannelId) return;

    try {
      const logChannel = message.guild.channels.cache.get(config.messageLogChannelId) as TextChannel;
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setAuthor({
          name: message.author?.username || 'Usuario desconocido',
          iconURL: message.author?.displayAvatarURL(),
        })
        .setTitle('Mensaje eliminado')
        .addFields(
          { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
          { name: 'Autor', value: message.author ? `<@${message.author.id}>` : 'Desconocido', inline: true },
          { name: 'Contenido', value: message.content?.slice(0, 1024) || '*Sin contenido de texto*' }
        )
        .setFooter({ text: `ID del mensaje: ${message.id}` })
        .setTimestamp();

      if (message.attachments.size > 0) {
        embed.addFields({
          name: 'Adjuntos',
          value: message.attachments.map((a) => a.url).join('\n').slice(0, 1024),
        });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[MessageLog] Error logging deleted message: ${err}`);
    }
  },
};
