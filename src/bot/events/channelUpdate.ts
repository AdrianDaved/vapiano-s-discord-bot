/**
 * channelUpdate event — Logs channel changes to audit log.
 */
import { Events, DMChannel, GuildChannel, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';
import { sendAudit } from '../modules/audit/auditLogger';

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
        changes.push(`**Nombre:** \`${oldGC.name}\` → \`${newGC.name}\``);
      }
      if (oldGC.parent?.id !== newGC.parent?.id) {
        changes.push(`**Categoria:** ${oldGC.parent?.name || 'Ninguna'} → ${newGC.parent?.name || 'Ninguna'}`);
      }
      if ('topic' in oldGC && 'topic' in newGC) {
        const oldTopic = (oldGC as TextChannel).topic;
        const newTopic = (newGC as TextChannel).topic;
        if (oldTopic !== newTopic) {
          changes.push(`**Tema:** ${oldTopic?.slice(0, 100) || '*Ninguno*'} → ${newTopic?.slice(0, 100) || '*Ninguno*'}`);
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
           changes.push(`**Modo lento:** ${oldSlow}s → ${newSlow}s`);
        }
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('Canal actualizado')
        .addFields(
          { name: 'Canal', value: `<#${newGC.id}> (${newGC.name})`, inline: true },
          { name: 'Cambios', value: changes.join('\n') },
        )
        .setFooter({ text: `ID del canal: ${newGC.id}` })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
        await sendAudit(newChannel.guild.id, embed, client, logChannelId);
    } catch (err) {
      logger.error(`[Logging] Error in channelUpdate: ${err}`);
    }
  },
};
