import { Events, Message, EmbedBuilder, TextChannel, PartialMessage } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.MessageUpdate,
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage, client: BotClient) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const config = await getGuildConfig(newMessage.guild.id);
    if (!config.messageLogChannelId) return;

    try {
      const logChannel = newMessage.guild.channels.cache.get(config.messageLogChannelId) as TextChannel;
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setAuthor({
          name: newMessage.author?.username || 'Usuario desconocido',
          iconURL: newMessage.author?.displayAvatarURL(),
        })
        .setTitle('Mensaje editado')
        .addFields(
          { name: 'Canal', value: `<#${newMessage.channelId}>`, inline: true },
          { name: 'Autor', value: newMessage.author ? `<@${newMessage.author.id}>` : 'Desconocido', inline: true },
          { name: 'Antes', value: oldMessage.content?.slice(0, 1024) || '*Sin contenido guardado*' },
          { name: 'Despues', value: newMessage.content?.slice(0, 1024) || '*Sin contenido de texto*' }
        )
        .setFooter({ text: `ID del mensaje: ${newMessage.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[MessageLog] Error logging edited message: ${err}`);
    }
  },
};
