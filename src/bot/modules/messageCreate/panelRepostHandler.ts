import { TextChannel } from 'discord.js';
import { MessageHandler } from './pipeline';
import { buildPanelMessage } from '../../../shared/ticketPanelMessage';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

// Per-process state — channels currently being reposted (re-entrancy guard)
// and the timestamp of the most recent repost per channel (cooldown).
const repostingChannels = new Set<string>();
const repostCooldownAt = new Map<string, number>();

const DEFAULT_COOLDOWN_SECONDS = 5;

/**
 * "Sticky" ticket panel: when a panel is configured with `panelAutoRepost`,
 * any new message in its channel deletes the old panel and re-posts it at
 * the bottom so it stays visible. Cooldowned per channel.
 */
export const panelRepostHandler: MessageHandler = {
  name: 'panelRepost',
  async handle({ message }) {
    const channelId = message.channelId;
    const guildId = message.guild!.id;

    if (repostingChannels.has(channelId)) return;

    const trigger = await prisma.ticketPanel.findFirst({
      where: { channelId, guildId, panelAutoRepost: true, messageId: { not: null } },
    });
    if (!trigger?.messageId) return;

    // Skip bot messages by default to avoid infinite loops with other bots
    // (and our own confirmations).
    if (message.author.bot && trigger.panelAutoRepostIgnoreBots !== false) return;

    const cooldownMs = (trigger.panelAutoRepostCooldown ?? DEFAULT_COOLDOWN_SECONDS) * 1000;
    const lastAt = repostCooldownAt.get(channelId) ?? 0;
    if (Date.now() - lastAt < cooldownMs) return;

    repostingChannels.add(channelId);
    repostCooldownAt.set(channelId, Date.now());
    try {
      const channel = message.channel as TextChannel;

      // All panels in the same deployed group share one Discord message.
      const groupPanels = await prisma.ticketPanel.findMany({
        where: { channelId, guildId, messageId: trigger.messageId },
        orderBy: { createdAt: 'asc' },
      });
      if (groupPanels.length === 0) return;

      // Delete the previous panel message (best-effort)
      const oldMsg = await channel.messages.fetch(trigger.messageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});

      // Re-post using the shared builder so this stays in lockstep with the
      // API's deploy / sync paths. The builder returns plain Discord API
      // objects which discord.js accepts at runtime, but the TS types want
      // its own MessageCreateOptions shape — cast through unknown.
      const payload = buildPanelMessage(groupPanels);
      const newMsg = await channel.send(payload as unknown as Parameters<typeof channel.send>[0]);

      await prisma.ticketPanel.updateMany({
        where: { id: { in: groupPanels.map((p) => p.id) } },
        data: { messageId: newMsg.id },
      });

      logger.info(`[PanelRepost] Re-posted ${groupPanels.length}-button group in ${channelId}`);
    } finally {
      repostingChannels.delete(channelId);
    }
  },
};
