import { Events, Message, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig, moduleColor } from '../utils';
import { checkAutomod } from '../modules/moderation/automod';
import { checkAutoResponses } from '../modules/automation/autoResponses';
import { processStickyMessage } from '../modules/sticky/stickyHandler';
import prisma from '../../database/client';
import { getGlobalRep } from '../modules/reputation/globalRep';
import logger from '../../shared/logger';
import { addXp } from '../modules/levels/xpManager';

// Prevent concurrent reposts in the same channel
const repostingChannels = new Set<string>();
// Per-channel cooldown: channelId -> timestamp of last repost
const repostCooldownMap = new Map<string, number>();

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: BotClient) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    const config = await getGuildConfig(message.guild.id);

    // --- AutoMod Check (runs first, may delete message) ---
    if (config.automodEnabled) {
      const blocked = await checkAutomod(message, config);
      if (blocked) return; // message was deleted by automod
    }

    // --- AFK System ---
    // Check if the sender is AFK -- remove their status
    try {
      const afkStatus = await prisma.afkStatus.findUnique({
        where: { guildId_userId: { guildId: message.guild.id, userId: message.author.id } },
      });

      if (afkStatus) {
        await prisma.afkStatus.delete({
          where: { id: afkStatus.id },
        });

        const elapsed = Date.now() - afkStatus.createdAt.getTime();
        const minutes = Math.floor(elapsed / 60000);
        const hours = Math.floor(minutes / 60);
        const timeStr = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

        const reply = await message.reply({
          content: `¡Bienvenido de vuelta! Estuviste AFK por **${timeStr}**.`,
        });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
      }
    } catch { /* ignore */ }

    // Check if any mentioned users are AFK
    if (message.mentions.users.size > 0) {
      try {
        const afkUsers = await prisma.afkStatus.findMany({
          where: {
            guildId: message.guild.id,
            userId: { in: message.mentions.users.map((u) => u.id) },
          },
        });

        if (afkUsers.length > 0) {
          const lines = afkUsers.map((afk) => {
            const timestamp = Math.floor(afk.createdAt.getTime() / 1000);
            return `<@${afk.userId}> está AFK: **${afk.reason}** (desde <t:${timestamp}:R>)`;
          });

          await message.reply({ content: lines.join('\n') });
        }
      } catch { /* ignore */ }
    }

    // --- Auto-Responses ---
    if (config.automationEnabled) {
      await checkAutoResponses(message, config);
    }

    // --- +rep message command ---
    if (config.reputationEnabled && message.content.startsWith('+rep')) {
      const args = message.content.slice(4).trim();
      const target = message.mentions.users.first();

      if (target) {
        if (target.id === message.author.id) {
          await message.reply({ content: 'No puedes darte reputación a ti mismo.' });
        } else if (target.bot) {
          await message.reply({ content: 'No puedes dar reputación a bots.' });
        } else {
          // Extract reason: everything after the mention
          const mentionPattern = /<@!?\d+>/;
          const reason = args.replace(mentionPattern, '').trim() || null;

          await prisma.reputation.create({
            data: {
              guildId: message.guild.id,
              userId: target.id,
              giverId: message.author.id,
              reason,
            },
          });

          const totalRep = await getGlobalRep(target.id); // was: prisma.reputation.count({
            

          const embed = new EmbedBuilder()
            .setColor(moduleColor('reputation'))
            .setDescription(`${message.author} dio **+1 rep** a ${target}${reason ? `\nRazón: ${reason}` : ''}`)
            .setFooter({ text: `${target.username} ahora tiene ${totalRep} rep` })
            .setTimestamp();

          await message.reply({ embeds: [embed] });
        }
      }
    }

    // --- Ticket Activity Tracking ---
    try {
      await prisma.ticket.updateMany({
        where: { channelId: message.channelId, status: 'open' },
        data: { lastActivityAt: new Date() },
      });
    } catch { /* ignore -- channel is not a ticket */ }

    // --- Panel Auto-Repost (Sticky Ticket Panel) ---
    if (!repostingChannels.has(message.channelId)) {
      try {
        const panel = await prisma.ticketPanel.findFirst({
          where: { channelId: message.channelId, guildId: message.guild.id, panelAutoRepost: true, messageId: { not: null } },
        });
        if (panel && panel.messageId) {
          // Skip bot messages if configured to do so
          if (message.author.bot && (panel as any).panelAutoRepostIgnoreBots !== false) {
            // ignore
          } else {
            // Cooldown check (per-channel)
            const cooldownMs = ((panel as any).panelAutoRepostCooldown ?? 5) * 1000;
            const lastRepost = repostCooldownMap.get(message.channelId) ?? 0;
            if (Date.now() - lastRepost >= cooldownMs) {
              repostingChannels.add(message.channelId);
              repostCooldownMap.set(message.channelId, Date.now());
              try {
                const channel = message.channel as TextChannel;

                // Delete old panel message
                const oldMsg = await channel.messages.fetch(panel.messageId).catch(() => null);
                if (oldMsg) await oldMsg.delete().catch(() => {});

                // Rebuild panel embed
                const colorHex = (panel.embedColor || '#5865F2').replace('#', '');
                const colorInt = parseInt(colorHex, 16) || 0x5865f2;
                const panelEmbed = new EmbedBuilder().setColor(colorInt);
                if (panel.title) panelEmbed.setTitle(panel.title);
                if (panel.description) panelEmbed.setDescription(panel.description);
                if (panel.footerText) panelEmbed.setFooter({ text: panel.footerText });

                // Build the "open ticket" button (not the in-ticket management row)
                const buttonLabel = panel.buttonLabel || 'Abrir ticket';
                const buttonColorMap: Record<string, ButtonStyle> = {
                  Primary: ButtonStyle.Primary,
                  Secondary: ButtonStyle.Secondary,
                  Success: ButtonStyle.Success,
                  Danger: ButtonStyle.Danger,
                };
                const buttonStyle = buttonColorMap[panel.buttonColor || 'Primary'] ?? ButtonStyle.Primary;
                const btn = new ButtonBuilder()
                  .setCustomId(`ticket_create_${panel.id}`)
                  .setLabel(buttonLabel)
                  .setStyle(buttonStyle);
                if (panel.buttonEmoji) btn.setEmoji(panel.buttonEmoji);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);

                const newMsg = await channel.send({ embeds: [panelEmbed], components: [row] });

                await prisma.ticketPanel.update({
                  where: { id: panel.id },
                  data: { messageId: newMsg.id },
                });

                logger.info(`[PanelRepost] Re-posted panel "${panel.name}" in ${message.channelId}`);
              } catch (err) {
                logger.error(`[PanelRepost] Failed to repost panel: ${err}`);
              } finally {
                repostingChannels.delete(message.channelId);
              }
            }
          }
        }
      } catch { /* ignore */ }
    }


    // --- XP / Levels System ---
    if (config.levelsEnabled) {
      try {
        const ignored = (config as any).levelIgnoredChannels as string[] | undefined;
        const ignoredRoles = (config as any).levelIgnoredRoles as string[] | undefined;
        const isIgnoredChannel = ignored?.includes(message.channel.id);
        const member = message.member;
        const isIgnoredRole = ignoredRoles && member
          ? member.roles.cache.some((r) => ignoredRoles.includes(r.id))
          : false;

        if (!isIgnoredChannel && !isIgnoredRole) {
          const xpAmount = (config as any).xpPerMessage ?? 15;
          const cooldown = (config as any).xpCooldownSeconds ?? 60;
          const result = await addXp(message.author.id, message.guild.id, xpAmount, cooldown);

          if (result?.leveledUp) {
            const levelUpChannelId = (config as any).levelUpChannelId as string | undefined;
            const rawMsg = (config as any).levelUpMessage as string | undefined;
            const levelMsg = (rawMsg ?? '🎉 {user} subio al nivel **{level}**!')
              .replace('{user}', `<@${message.author.id}>`)
              .replace('{level}', String(result.newLevel));

            const targetChannelId = levelUpChannelId || message.channel.id;
            const ch = message.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;
            if (ch) {
              await ch.send({ content: levelMsg });
            }
          }
        }
      } catch (err) {
        logger.error('XP system error:', err);
      }
    }

    // --- Sticky Messages ---
    // Re-send sticky message if this channel has one (runs last, after all other checks)
    await processStickyMessage(message);
  },
};
