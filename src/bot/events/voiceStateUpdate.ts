/**
 * voiceStateUpdate event — Logs voice channel join/leave/move.
 */
import { Events, VoiceState, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';
import { sendAudit } from '../modules/audit/auditLogger';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState, client: BotClient) {
    const guild = newState.guild;
    if (!guild) return;

    const config = await getGuildConfig(guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.voiceLogChannelId || config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    const member = newState.member;
    if (!member || member.user.bot) return;

    try {
      // Joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle('Se unio a un canal de voz')
          .addFields(
            { name: 'Usuario', value: `<@${member.id}>`, inline: true },
            { name: 'Canal', value: `<#${newState.channelId}>`, inline: true },
          )
          .setFooter({ text: `ID de usuario: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
        await sendAudit(guild.id, embed, client, logChannelId);
      }
      // Left a voice channel
      else if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle('Salio de un canal de voz')
          .addFields(
            { name: 'Usuario', value: `<@${member.id}>`, inline: true },
            { name: 'Canal', value: `<#${oldState.channelId}>`, inline: true },
          )
          .setFooter({ text: `ID de usuario: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
        await sendAudit(guild.id, embed, client, logChannelId);
      }
      // Moved between voice channels
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle('Se movio entre canales de voz')
          .addFields(
            { name: 'Usuario', value: `<@${member.id}>`, inline: true },
            { name: 'De', value: `<#${oldState.channelId}>`, inline: true },
            { name: 'A', value: `<#${newState.channelId}>`, inline: true },
          )
          .setFooter({ text: `ID de usuario: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
        await sendAudit(guild.id, embed, client, logChannelId);
      }

      // Server mute/deafen changes
      if (oldState.serverMute !== newState.serverMute) {
        const embed = new EmbedBuilder()
          .setColor(0xeb459e)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle(newState.serverMute ? 'Silenciado por el servidor' : 'Silencio del servidor quitado')
          .addFields(
            { name: 'Usuario', value: `<@${member.id}>`, inline: true },
            { name: 'Canal', value: newState.channelId ? `<#${newState.channelId}>` : 'Ninguno', inline: true },
          )
          .setFooter({ text: `ID de usuario: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
        await sendAudit(guild.id, embed, client, logChannelId);
      }

      if (oldState.serverDeaf !== newState.serverDeaf) {
        const embed = new EmbedBuilder()
          .setColor(0xeb459e)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle(newState.serverDeaf ? 'Enmudecido por el servidor' : 'Enmudecimiento del servidor quitado')
          .addFields(
            { name: 'Usuario', value: `<@${member.id}>`, inline: true },
            { name: 'Canal', value: newState.channelId ? `<#${newState.channelId}>` : 'Ninguno', inline: true },
          )
          .setFooter({ text: `ID de usuario: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
        await sendAudit(guild.id, embed, client, logChannelId);
      }
    } catch (err) {
      logger.error(`[Logging] Error in voiceStateUpdate: ${err}`);
    }
  },
};
