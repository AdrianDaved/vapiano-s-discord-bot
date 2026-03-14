/**
 * voiceStateUpdate event — Logs voice channel join/leave/move.
 */
import { Events, VoiceState, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

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
          .setTitle('Voice Channel Joined')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
          )
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
      // Left a voice channel
      else if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle('Voice Channel Left')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true },
          )
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
      // Moved between voice channels
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle('Voice Channel Moved')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
            { name: 'To', value: `<#${newState.channelId}>`, inline: true },
          )
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }

      // Server mute/deafen changes
      if (oldState.serverMute !== newState.serverMute) {
        const embed = new EmbedBuilder()
          .setColor(0xeb459e)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle(newState.serverMute ? 'Server Muted' : 'Server Unmuted')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: newState.channelId ? `<#${newState.channelId}>` : 'None', inline: true },
          )
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }

      if (oldState.serverDeaf !== newState.serverDeaf) {
        const embed = new EmbedBuilder()
          .setColor(0xeb459e)
          .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
          .setTitle(newState.serverDeaf ? 'Server Deafened' : 'Server Undeafened')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: newState.channelId ? `<#${newState.channelId}>` : 'None', inline: true },
          )
          .setFooter({ text: `User ID: ${member.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error(`[Logging] Error in voiceStateUpdate: ${err}`);
    }
  },
};
