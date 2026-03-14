/**
 * Sticky Message Handler
 * 
 * When a new message is sent in a channel with a sticky message,
 * the bot deletes the old sticky and re-sends it so it stays at the bottom.
 * 
 * Uses a cooldown to avoid spamming (minimum 5 seconds between re-sends).
 */
import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

// Cooldown map: channelId -> last re-send timestamp
const stickyCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5000; // 5 seconds between re-sends

// Cache of active sticky channel IDs for fast lookup (avoids DB query on every message)
const activeStickyChannels = new Set<string>();
let cacheLoaded = false;

/**
 * Load active sticky channels into memory cache
 */
export async function loadStickyCache(): Promise<void> {
  try {
    const stickies = await prisma.stickyMessage.findMany({
      where: { enabled: true },
      select: { channelId: true },
    });
    activeStickyChannels.clear();
    for (const s of stickies) {
      activeStickyChannels.add(s.channelId);
    }
    cacheLoaded = true;
    logger.info(`[Sticky] Loaded ${activeStickyChannels.size} active sticky channels`);
  } catch (err) {
    logger.error(`[Sticky] Failed to load cache: ${err}`);
  }
}

/**
 * Add a channel to the active sticky cache
 */
export function addToStickyCache(channelId: string): void {
  activeStickyChannels.add(channelId);
}

/**
 * Remove a channel from the active sticky cache
 */
export function removeFromStickyCache(channelId: string): void {
  activeStickyChannels.delete(channelId);
  stickyCooldowns.delete(channelId);
}

/**
 * Process a new message — check if the channel has a sticky and re-send it
 */
export async function processStickyMessage(message: Message): Promise<void> {
  // Load cache on first call
  if (!cacheLoaded) {
    await loadStickyCache();
  }

  const channelId = message.channel.id;

  // Fast check: is this channel in our active set?
  if (!activeStickyChannels.has(channelId)) return;

  // Cooldown check
  const lastSend = stickyCooldowns.get(channelId) || 0;
  if (Date.now() - lastSend < COOLDOWN_MS) return;

  // Mark cooldown immediately to prevent race conditions
  stickyCooldowns.set(channelId, Date.now());

  try {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId },
    });

    if (!sticky || !sticky.enabled) {
      activeStickyChannels.delete(channelId);
      return;
    }

    const channel = message.channel as TextChannel;

    // Delete the old sticky message
    if (sticky.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(sticky.messageId);
        await oldMsg.delete();
      } catch {
        // Message already deleted or not found — that's fine
      }
    }

    // Parse color
    let colorInt = 0x5865F2;
    try {
      colorInt = parseInt(sticky.color.replace('#', ''), 16);
    } catch { /* default */ }

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
