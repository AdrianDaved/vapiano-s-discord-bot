/**
 * channelUpdate event — Logs channel changes to audit log.
 */
import { Events, DMChannel, GuildChannel, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.ChannelUpdate,
  async execute(oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel, client: BotClient) {
    if (!('guild' in newChannel) || !newChannel.guild) return;

    const config = await getGuildConfig(newChannel.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = newChannel.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      const changes: string[] = [];
      const oldGC = oldChannel as GuildChannel;
      const newGC = newChannel as GuildChannel;

      if (oldGC.name !== newGC.name) {
        changes.push(`**Name:** \`${oldGC.name}\` → \`${newGC.name}\``);
      }
      if (oldGC.parent?.id !== newGC.parent?.id) {
        changes.push(`**Category:** ${oldGC.parent?.name || 'None'} → ${newGC.parent?.name || 'None'}`);
      }
      if ('topic' in oldGC && 'topic' in newGC) {
        const oldTopic = (oldGC as TextChannel).topic;
        const newTopic = (newGC as TextChannel).topic;
        if (oldTopic !== newTopic) {
          changes.push(`**Topic:** ${oldTopic?.slice(0, 100) || '*None*'} → ${newTopic?.slice(0, 100) || '*None*'}`);
        }
      }
      if ('nsfw' in oldGC && 'nsfw' in newGC) {
        if ((oldGC as TextChannel).nsfw !== (newGC as TextChannel).nsfw) {
          changes.push(`**NSFW:** ${(oldGC as TextChannel).nsfw} → ${(newGC as TextChannel).nsfw}`);
        }
      }
      if ('rateLimitPerUser' in oldGC && 'rateLimitPerUser' in newGC) {
        const oldSlow = (oldGC as TextChannel).rateLimitPerUser;
        const newSlow = (newGC as TextChannel).rateLimitPerUser;
        if (oldSlow !== newSlow) {
          changes.push(`**Slowmode:** ${oldSlow}s → ${newSlow}s`);
        }
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('Channel Updated')
        .addFields(
          { name: 'Channel', value: `<#${newGC.id}> (${newGC.name})`, inline: true },
          { name: 'Changes', value: changes.join('\n') },
        )
        .setFooter({ text: `Channel ID: ${newGC.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Logging] Error in channelUpdate: ${err}`);
    }
  },
};
