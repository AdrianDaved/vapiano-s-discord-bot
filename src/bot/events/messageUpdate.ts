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
          name: newMessage.author?.username || 'Unknown User',
          iconURL: newMessage.author?.displayAvatarURL(),
        })
        .setTitle('Message Edited')
        .addFields(
          { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
          { name: 'Author', value: newMessage.author ? `<@${newMessage.author.id}>` : 'Unknown', inline: true },
          { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*No content cached*' },
          { name: 'After', value: newMessage.content?.slice(0, 1024) || '*No text content*' }
        )
        .setFooter({ text: `Message ID: ${newMessage.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[MessageLog] Error logging edited message: ${err}`);
    }
  },
};
