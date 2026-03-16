/**
 * Sticky Message Handler
 *
 * When a new message is sent in a channel with a sticky message,
 * the bot deletes the old sticky and re-sends it so it stays at the bottom.
 *
 * Uses a cooldown to avoid spamming (minimum 5 seconds between re-sends).
 */
import { Message, EmbedBuilder, TextChannel } from "discord.js";
import prisma from "../../../database/client";
import logger from "../../../shared/logger";

// Cooldown map: channelId -> last re-send timestamp
const stickyCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5000; // 5 seconds between re-sends

/**
 * Process a new message — check if the channel has a sticky and re-send it
 */
export async function processStickyMessage(message: Message): Promise<void> {
  const channelId = message.channel.id;

  // Cooldown check (fast, no DB query)
  const lastSend = stickyCooldowns.get(channelId) || 0;
  if (Date.now() - lastSend < COOLDOWN_MS) return;

  try {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId },
    });

    // No sticky or disabled — nothing to do
    if (!sticky || !sticky.enabled) return;

    // Mark cooldown now that we confirmed there is an active sticky
    stickyCooldowns.set(channelId, Date.now());

    const channel = message.channel as TextChannel;

    // Delete the old sticky message
    if (sticky.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(sticky.messageId);
        await oldMsg.delete();
      } catch {
        // Already deleted or not found — fine
      }
    }

    // Parse color
    let colorInt = 0x5865f2;
    try {
      colorInt = parseInt(sticky.color.replace("#", ""), 16);
    } catch {
      /* default */
    }

    // Build and send the sticky embed
    const embed = new EmbedBuilder().setColor(colorInt);
    if (sticky.title) embed.setTitle(sticky.title);
    if (sticky.description) embed.setDescription(sticky.description);

    const sent = await channel.send({ embeds: [embed] });

    // Update the message ID in the database
    await prisma.stickyMessage.update({
      where: { channelId },
      data: { messageId: sent.id },
    });
  } catch (err) {
    logger.error(`[Sticky] Error re-sending sticky in ${channelId}: ${err}`);
  }
}
