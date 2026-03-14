import { Events, Message, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig, moduleColor } from '../utils';
import { processXp } from '../modules/leveling/xpProcessor';
import { checkAutomod } from '../modules/moderation/automod';
import { checkAutoResponses } from '../modules/automation/autoResponses';
import { processStickyMessage } from '../modules/sticky/stickyHandler';
import prisma from '../../database/client';
import logger from '../../shared/logger';

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: BotClient) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    const config = await getGuildConfig(message.guild.id);

    // ─── AutoMod Check (runs first, may delete message) ──
    if (config.automodEnabled) {
      const blocked = await checkAutomod(message, config);
      if (blocked) return; // message was deleted by automod
    }

    // ─── AFK System ─────────────────────────────────────
    // Check if the sender is AFK — remove their status
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
          content: `Welcome back! You were AFK for **${timeStr}**.`,
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
            return `<@${afk.userId}> is AFK: **${afk.reason}** (since <t:${timestamp}:R>)`;
          });

          await message.reply({ content: lines.join('\n') });
        }
      } catch { /* ignore */ }
    }

    // ─── Leveling XP ────────────────────────────────────
    if (config.levelingEnabled) {
      await processXp(message, config, client);
    }

    // ─── Auto-Responses ─────────────────────────────────
    if (config.automationEnabled) {
      await checkAutoResponses(message, config);
    }

    // ─── Sticky Messages ─────────────────────────────────
    // Re-send sticky message if this channel has one (runs last, after all other checks)
    await processStickyMessage(message);
  },
};
