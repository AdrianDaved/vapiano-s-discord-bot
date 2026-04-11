import { Events, Message, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig, moduleColor } from '../utils';
import { checkAutomod } from '../modules/moderation/automod';
import { checkAutoResponses } from '../modules/automation/autoResponses';
import { processStickyMessage } from '../modules/sticky/stickyHandler';
import prisma from '../../database/client';
import { getGlobalRep } from '../modules/reputation/globalRep';
import logger from '../../shared/logger';

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
        // Find the first sticky panel in this channel to get the messageId
        const trigger = await prisma.ticketPanel.findFirst({
          where: { channelId: message.channelId, guildId: message.guild.id, panelAutoRepost: true, messageId: { not: null } },
        });
        if (trigger && trigger.messageId) {
          // Skip bot messages if configured
          if (message.author.bot && trigger.panelAutoRepostIgnoreBots !== false) {
            // ignore bots to avoid infinite loops
          } else {
            // Cooldown check (per-channel)
            const cooldownMs = (trigger.panelAutoRepostCooldown ?? 5) * 1000;
            const lastRepost = repostCooldownMap.get(message.channelId) ?? 0;
            if (Date.now() - lastRepost >= cooldownMs) {
              repostingChannels.add(message.channelId);
              repostCooldownMap.set(message.channelId, Date.now());
              try {
                const channel = message.channel as TextChannel;

                // Fetch ALL panels in the same deployed group (same messageId + channelId)
                const groupPanels = await prisma.ticketPanel.findMany({
                  where: { channelId: message.channelId, guildId: message.guild.id, messageId: trigger.messageId },
                  orderBy: { createdAt: 'asc' },
                });

                // Delete the old panel message
                const oldMsg = await channel.messages.fetch(trigger.messageId).catch(() => null);
                if (oldMsg) await oldMsg.delete().catch(() => {});

                // Build embed using group-level fields (set by deployPanels / syncDiscordMessage)
                const first = groupPanels[0];
                const colorHex = (first.groupEmbedColor || first.embedColor || '#5865F2').replace('#', '');
                const colorInt = parseInt(colorHex, 16) || 0x5865f2;
                const panelEmbed = new EmbedBuilder().setColor(colorInt as any);
                panelEmbed.setTitle(first.groupEmbedTitle || first.title || 'Sistema de Tickets');
                if (first.groupEmbedDescription || first.description) {
                  panelEmbed.setDescription(first.groupEmbedDescription || first.description);
                }
                if (first.footerText) panelEmbed.setFooter({ text: first.footerText });

                // Build one button per panel in the group (preserving order)
                const buttonColorMap: Record<string, ButtonStyle> = {
                  Primary: ButtonStyle.Primary, primary: ButtonStyle.Primary,
                  Secondary: ButtonStyle.Secondary, secondary: ButtonStyle.Secondary,
                  Success: ButtonStyle.Success, success: ButtonStyle.Success,
                  Danger: ButtonStyle.Danger, danger: ButtonStyle.Danger,
                };
                const buttons = groupPanels.map((p) => {
                  const btn = new ButtonBuilder()
                    .setCustomId(`ticket_create_${p.id}`)
                    .setLabel(p.buttonLabel || p.name)
                    .setStyle(buttonColorMap[p.buttonColor] ?? ButtonStyle.Primary);
                  if (p.buttonEmoji) {
                    const customMatch = p.buttonEmoji.match(/^<a?:(\w+):(\d+)>$/);
                    if (customMatch) btn.setEmoji({ name: customMatch[1], id: customMatch[2] });
                    else btn.setEmoji(p.buttonEmoji);
                  }
                  return btn;
                });
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

                const newMsg = await channel.send({ embeds: [panelEmbed], components: [row] });

                // Update messageId on ALL panels in the group
                await prisma.ticketPanel.updateMany({
                  where: { id: { in: groupPanels.map((p) => p.id) } },
                  data: { messageId: newMsg.id },
                });

                logger.info(`[PanelRepost] Re-posted ${groupPanels.length}-button group in ${message.channelId}`);
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


    // --- Sticky Messages ---
    // Re-send sticky message if this channel has one (runs last, after all other checks)
    await processStickyMessage(message);
  },
};
