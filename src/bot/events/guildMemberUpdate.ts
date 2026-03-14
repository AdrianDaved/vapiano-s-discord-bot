/**
 * guildMemberUpdate event — Logs role changes and nickname changes.
 */
import { Events, GuildMember, EmbedBuilder, TextChannel, PartialGuildMember } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember, client: BotClient) {
    if (!newMember.guild) return;

    const config = await getGuildConfig(newMember.guild.id);
    if (!config.loggingEnabled) return;

    const logChannelId = config.auditLogChannelId || config.modLogChannelId;
    if (!logChannelId) return;

    const logChannel = newMember.guild.channels.cache.get(logChannelId) as TextChannel;
    if (!logChannel) return;

    try {
      // ─── Role Changes ─────────────────────────────────
      const oldRoles = oldMember.roles?.cache;
      const newRoles = newMember.roles.cache;

      if (oldRoles) {
        const addedRoles = newRoles.filter((r) => !oldRoles.has(r.id) && r.id !== newMember.guild.id);
        const removedRoles = oldRoles.filter((r) => !newRoles.has(r.id) && r.id !== newMember.guild.id);

        if (addedRoles.size > 0) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setTitle('Roles Added')
            .addFields(
              { name: 'User', value: `<@${newMember.id}>`, inline: true },
              { name: 'Roles Added', value: addedRoles.map((r) => r.toString()).join(', '), inline: true },
            )
            .setFooter({ text: `User ID: ${newMember.id}` })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }

        if (removedRoles.size > 0) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setTitle('Roles Removed')
            .addFields(
              { name: 'User', value: `<@${newMember.id}>`, inline: true },
              { name: 'Roles Removed', value: removedRoles.map((r) => r.toString()).join(', '), inline: true },
            )
            .setFooter({ text: `User ID: ${newMember.id}` })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // ─── Nickname Changes ─────────────────────────────
      const oldNick = oldMember.nickname;
      const newNick = newMember.nickname;

      if (oldNick !== newNick) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
          .setTitle('Nickname Changed')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
            { name: 'Before', value: oldNick || '*None*', inline: true },
            { name: 'After', value: newNick || '*None*', inline: true },
          )
          .setFooter({ text: `User ID: ${newMember.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }

      // ─── Timeout Changes ──────────────────────────────
      const oldTimeout = oldMember.communicationDisabledUntil;
      const newTimeout = newMember.communicationDisabledUntil;

      if (!oldTimeout && newTimeout) {
        const embed = new EmbedBuilder()
          .setColor(0xeb459e)
          .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
          .setTitle('Member Timed Out')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
            { name: 'Until', value: `<t:${Math.floor(newTimeout.getTime() / 1000)}:R>`, inline: true },
          )
          .setFooter({ text: `User ID: ${newMember.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      } else if (oldTimeout && !newTimeout) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
          .setTitle('Timeout Removed')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
          )
          .setFooter({ text: `User ID: ${newMember.id}` })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error(`[Logging] Error in guildMemberUpdate: ${err}`);
    }
  },
};
