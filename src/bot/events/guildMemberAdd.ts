import { Events, GuildMember, EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';
import { BotClient, InviteData } from '../../shared/types';
import { inviteCache } from './ready';
import { getGuildConfig, replaceTemplateVars } from '../utils';
import { generateWelcomeImage } from '../modules/welcome/welcomeImage';
import prisma from '../../database/client';
import logger from '../../shared/logger';

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember, client: BotClient) {
    const { guild } = member;
    const config = await getGuildConfig(guild.id);

    // ─── Invite Tracking ─────────────────────────────────
    if (config.invitesEnabled) {
      try {
        const oldInvites = inviteCache.get(guild.id) || new Map<string, InviteData>();
        const newInvites = await guild.invites.fetch();
        const newCache = new Map<string, InviteData>();

        // Find the invite that was used (uses increased by 1)
        let usedInvite: { code: string; inviterId: string | null } | null = null;

        for (const inv of newInvites.values()) {
          newCache.set(inv.code, {
            code: inv.code,
            uses: inv.uses ?? 0,
            inviterId: inv.inviter?.id ?? null,
          });

          const oldInv = oldInvites.get(inv.code);
          if (oldInv && (inv.uses ?? 0) > oldInv.uses) {
            usedInvite = { code: inv.code, inviterId: inv.inviter?.id ?? null };
          }
        }

        // Update cache
        inviteCache.set(guild.id, newCache);

        // Detect fake invites: account younger than 7 days
        const accountAge = Date.now() - member.user.createdTimestamp;
        const isFake = accountAge < 7 * 24 * 60 * 60 * 1000;

        if (usedInvite && usedInvite.inviterId) {
          await prisma.invite.create({
            data: {
              guildId: guild.id,
              inviterId: usedInvite.inviterId,
              invitedId: member.id,
              code: usedInvite.code,
              fake: isFake,
            },
          });
          logger.info(
            `[Invites] ${member.user.username} joined ${guild.name} via invite ${usedInvite.code} by ${usedInvite.inviterId}${isFake ? ' (FAKE)' : ''}`
          );
        }
      } catch (err) {
        logger.error(`[Invites] Error tracking invite for ${member.user.username}: ${err}`);
      }
    }

    // ─── Auto-Roles on Join ──────────────────────────────
    if (config.joinRoleIds && config.joinRoleIds.length > 0) {
      try {
        for (const roleId of config.joinRoleIds) {
          const role = guild.roles.cache.get(roleId);
          if (role && guild.members.me && role.position < guild.members.me.roles.highest.position) {
            await member.roles.add(role).catch(() => {});
          }
        }
      } catch (err) {
        logger.error(`[AutoRole] Error assigning join roles: ${err}`);
      }
    }

    // ─── Welcome Message ─────────────────────────────────
    if (config.welcomeEnabled && config.welcomeChannelId) {
      try {
        const channel = guild.channels.cache.get(config.welcomeChannelId) as TextChannel;
        if (!channel) return;

        // Get inviter info for template
        let inviterTag = 'Desconocido';
        if (config.invitesEnabled) {
          const inviteRecord = await prisma.invite.findFirst({
            where: { guildId: guild.id, invitedId: member.id },
            orderBy: { createdAt: 'desc' },
          });
          if (inviteRecord) {
            try {
              const inviter = await client.users.fetch(inviteRecord.inviterId);
              inviterTag = inviter.username;
            } catch { /* ignore */ }
          }
        }

        // Build the text message (e.g. "Bienvenido @User !")
        const textMessage = replaceTemplateVars(config.welcomeMessage || 'Bienvenido {user} !', {
          user: `<@${member.id}>`,
          username: member.user.username,
          tag: member.user.username,
          server: guild.name,
          memberCount: guild.memberCount.toString(),
          inviter: inviterTag,
        });

        // Generate welcome image if enabled (default: true)
        if (config.welcomeImageEnabled !== false) {
          try {
            const imageBuffer = await generateWelcomeImage(member);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
            await channel.send({
              content: textMessage,
              files: [attachment],
            });
          } catch (imgErr) {
            logger.error(`[Welcome] Failed to generate welcome image: ${imgErr}`);
            // Fallback: send text only
            await channel.send({ content: textMessage });
          }
        } else {
          // Image disabled — send as embed
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('¡Bienvenido!')
            .setDescription(textMessage)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `Miembro #${guild.memberCount}` })
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      } catch (err) {
        logger.error(`[Welcome] Error sending welcome message: ${err}`);
      }
    }

    // ─── Join/Leave Log ──────────────────────────────────
    if (config.joinLeaveLogChannelId) {
      try {
        const logChannel = guild.channels.cache.get(config.joinLeaveLogChannelId) as TextChannel;
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setAuthor({ name: 'Miembro se unió', iconURL: member.user.displayAvatarURL() })
            .addFields(
              { name: 'Usuario', value: `${member.user.username} (${member.id})`, inline: true },
              { name: 'Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: 'Total de miembros', value: guild.memberCount.toString(), inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      } catch (err) {
        logger.error(`[Log] Error sending join log: ${err}`);
      }
    }
  },
};
