import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig, replaceTemplateVars } from '../utils';
import prisma from '../../database/client';
import logger from '../../shared/logger';

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember, client: BotClient) {
    const { guild } = member;
    const config = await getGuildConfig(guild.id);

    // ─── Mark invite as "left" ───────────────────────────
    if (config.invitesEnabled) {
      try {
        await prisma.invite.updateMany({
          where: { guildId: guild.id, invitedId: member.id, left: false },
          data: { left: true },
        });
      } catch (err) {
        logger.error(`[Invites] Error marking leave for ${member.user.username}: ${err}`);
      }
    }

    // ─── Farewell Message ────────────────────────────────
    if (config.farewellEnabled && config.farewellChannelId && config.farewellMessage) {
      try {
        const channel = guild.channels.cache.get(config.farewellChannelId) as TextChannel;
        if (!channel) return;

        const message = replaceTemplateVars(config.farewellMessage, {
          user: member.user.username,
          username: member.user.username,
          tag: member.user.username,
          server: guild.name,
          memberCount: guild.memberCount.toString(),
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('Adios!')
          .setDescription(message)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `${guild.memberCount} miembros restantes` })
          .setTimestamp();

        await channel.send({ content: `${member}`, embeds: [embed] });
      } catch (err) {
        logger.error(`[Farewell] Error sending farewell message: ${err}`);
      }
    }

    // ─── Join/Leave Log ──────────────────────────────────
    if (config.joinLeaveLogChannelId) {
      try {
        const logChannel = guild.channels.cache.get(config.joinLeaveLogChannelId) as TextChannel;
        if (logChannel) {
          const roles = member.roles.cache
            .filter((r) => r.id !== guild.id)
            .map((r) => r.toString())
            .join(', ') || 'Ninguno';

          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setAuthor({ name: 'Miembro salio', iconURL: member.user.displayAvatarURL() })
            .addFields(
              { name: 'Usuario', value: `${member.user.username} (${member.id})`, inline: true },
              { name: 'Se unio', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Desconocido', inline: true },
              { name: 'Roles', value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      } catch (err) {
        logger.error(`[Log] Error sending leave log: ${err}`);
      }
    }
  },
};
