/**
 * Sticky Message Handler
 *
 * When a new message is sent in a channel with a sticky message,
 * the bot deletes the old sticky and re-sends it so it stays at the bottom.
 *
 * Uses an in-memory cache + lock to prevent race conditions and spam.
 */
import { Message, EmbedBuilder, TextChannel } from "discord.js";
import prisma from "../../../database/client";
import logger from "../../../shared/logger";

/**
 * In-memory Set of channel IDs that have an active sticky message.
 * Populated on bot startup via initStickyCache().
 */
const stickyChannels = new Set<string>();

/**
 * Lock set — channels currently in the middle of a delete/resend cycle.
 * Prevents race conditions when multiple messages arrive simultaneously.
 */
const processingChannels = new Set<string>();

/** Per-channel cooldown: channelId -> timestamp of last resend initiation */
const cooldownMap = new Map<string, number>();

/** Minimum ms between resend attempts per channel */
const RESEND_COOLDOWN_MS = 5_000;

// ─── Cache Initialization ─────────────────────────────────────────

/**
 * Load all channel IDs with active stickies from DB into memory.
 * Call once during bot startup (e.g. in the ready event).
 */
export async function initStickyCache(): Promise<void> {
  try {
    const stickies = await prisma.stickyMessage.findMany({
      where: { enabled: true },
      select: { channelId: true },
    });

    stickyChannels.clear();
    for (const s of stickies) {
      stickyChannels.add(s.channelId);
    }

    logger.info(`[Sticky] Cache initialized with ${stickyChannels.size} channel(s)`);
  } catch (err) {
    logger.error(`[Sticky] Failed to initialize cache: ${err}`);
  }
}

// ─── Cache Helpers ────────────────────────────────────────────────

export function addToStickyCache(channelId: string): void {
  stickyChannels.add(channelId);
}

export function removeFromStickyCache(channelId: string): void {
  stickyChannels.delete(channelId);
  cooldownMap.delete(channelId);
}

export function channelHasSticky(channelId: string): boolean {
  return stickyChannels.has(channelId);
}

// ─── Core: Process incoming message ───────────────────────────────

/**
 * Called from messageCreate event. Checks if the channel has a sticky
 * and re-sends it if needed.
 */
export async function processStickyMessage(message: Message): Promise<void> {
  const channelId = message.channelId;

  // 2. Ignore bot messages first (prevents infinite loop)
  if (message.author.bot) return;

  // 1. Fast in-memory check — with DB fallback for stickies created after startup
  if (!stickyChannels.has(channelId)) {
    try {
      const exists = await prisma.stickyMessage.findUnique({
        where: { channelId },
        select: { enabled: true },
      });
      if (!exists?.enabled) return;
      // Found in DB but not in cache — add it so future messages are fast
      stickyChannels.add(channelId);
    } catch { return; }
  }

  // 3. Cooldown check
  const lastResend = cooldownMap.get(channelId) ?? 0;
  const now = Date.now();
  if (now - lastResend < RESEND_COOLDOWN_MS) return;

  // 4. Lock check — another resend already in flight?
  if (processingChannels.has(channelId)) return;

  // Acquire lock + set cooldown atomically (synchronous)
  processingChannels.add(channelId);
  cooldownMap.set(channelId, now);

  try {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId },
    });

    // Row deleted between cache check and DB fetch — clean up
    if (!sticky || !sticky.enabled) {
      if (!sticky) stickyChannels.delete(channelId);
      return;
    }

    const channel = message.channel as TextChannel;

    // Delete the old sticky message
    if (sticky.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(sticky.messageId);
        await oldMsg.delete();
      } catch (err: any) {
        // 10008 = Unknown Message (already deleted) — silently ignore
        if (err?.code !== 10008) {
          logger.warn(`[Sticky] Could not delete old sticky in ${channelId}: ${err}`);
        }
      }
    }

    // Parse color
    let colorInt = 0x5865f2;
    try {
      colorInt = parseInt(sticky.color.replace("#", ""), 16);
    } catch { /* default */ }

    // Build and send the new sticky embed
    const embed = new EmbedBuilder().setColor(colorInt);
    if (sticky.title) embed.setTitle(sticky.title);
    if (sticky.description) embed.setDescription(sticky.description);

    const sent = await channel.send({ embeds: [embed] });

    // Update the message ID in DB so future resends delete the right message
    await prisma.stickyMessage.update({
      where: { channelId },
      data: { messageId: sent.id },
    });
  } catch (err) {
    logger.error(`[Sticky] Error re-sending sticky in ${channelId}: ${err}`);
  } finally {
    // Always release the lock
    processingChannels.delete(channelId);
  }
}

// ─── Resend on demand (from command/dashboard) ────────────────────

/**
 * Force resend a sticky message. Used after dashboard create/update
 * or the /fijo command. Bypasses cooldown.
 */
export async function resendStickyForChannel(
  channelId: string,
  channel: TextChannel,
): Promise<void> {
  stickyChannels.add(channelId);

  // Wait for any in-flight resend to finish
  const maxWait = 5_000;
  const poll = 100;
  let waited = 0;
  while (processingChannels.has(channelId) && waited < maxWait) {
    await new Promise((r) => setTimeout(r, poll));
    waited += poll;
  }

  processingChannels.add(channelId);
  try {
    const sticky = await prisma.stickyMessage.findUnique({
      where: { channelId },
    });

    if (!sticky) {
      stickyChannels.delete(channelId);
      return;
    }

    // Delete old message
    if (sticky.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(sticky.messageId);
        await oldMsg.delete();
      } catch (err: any) {
        if (err?.code !== 10008) {
          logger.warn(`[Sticky] Could not delete old sticky during resend in ${channelId}: ${err}`);
        }
      }
    }

    let colorInt = 0x5865f2;
    try {
      colorInt = parseInt(sticky.color.replace("#", ""), 16);
    } catch { /* default */ }

    const embed = new EmbedBuilder().setColor(colorInt);
    if (sticky.title) embed.setTitle(sticky.title);
    if (sticky.description) embed.setDescription(sticky.description);

    const sent = await channel.send({ embeds: [embed] });

    await prisma.stickyMessage.update({
      where: { channelId },
      data: { messageId: sent.id },
    });

    cooldownMap.set(channelId, Date.now());
    logger.info(`[Sticky] Resent sticky for channel ${channelId} (new msgId: ${sent.id})`);
  } catch (err) {
    logger.error(`[Sticky] Failed to resend sticky for ${channelId}: ${err}`);
  } finally {
    processingChannels.delete(channelId);
  }
}
