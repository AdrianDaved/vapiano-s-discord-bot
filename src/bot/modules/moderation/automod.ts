import { Message, EmbedBuilder, TextChannel } from "discord.js";
import logger from "../../../shared/logger";
import { registerInterval } from "../timerRegistry";

// Spam tracking: guildId:userId -> timestamps
const messageTimestamps = new Map<string, number[]>();

// Flood tracking: channelId -> timestamps (all users combined)
const channelFloodTimestamps = new Map<string, number[]>();

// Cleanup stale entries every 5 minutes (registered in timerRegistry for clean shutdown)
registerInterval(() => {
  const now = Date.now();
  const MAX_AGE = 60_000;
  for (const [key, timestamps] of messageTimestamps) {
    const filtered = timestamps.filter((t) => now - t < MAX_AGE);
    if (filtered.length === 0) messageTimestamps.delete(key);
    else messageTimestamps.set(key, filtered);
  }
  for (const [key, timestamps] of channelFloodTimestamps) {
    const filtered = timestamps.filter((t) => now - t < MAX_AGE);
    if (filtered.length === 0) channelFloodTimestamps.delete(key);
    else channelFloodTimestamps.set(key, filtered);
  }
}, 5 * 60_000);

/**
 * Run all automod checks on a message. Returns true if the message was blocked/deleted.
 */
export async function checkAutomod(message: Message, config: any): Promise<boolean> {
  const { guild, member, author } = message;
  if (!guild || !member) return false;

  // Skip exempt roles
  if (config.automodExemptRoleIds?.length > 0) {
    if (member.roles.cache.some((r: any) => config.automodExemptRoleIds.includes(r.id))) {
      return false;
    }
  }

  // Skip exempt channels
  if (config.automodExemptChannelIds?.includes(message.channelId)) {
    return false;
  }

  // Skip users with ManageMessages permission
  if (member.permissions.has("ManageMessages")) return false;

  // ─── Anti-Spam ─────────────────────────────────────────
  if (config.antiSpamEnabled) {
    const key = `${guild.id}:${author.id}`;
    const now = Date.now();
    const interval = (config.antiSpamInterval || 5) * 1000;
    const threshold = config.antiSpamThreshold || 5;

    let timestamps = messageTimestamps.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < interval);
    timestamps.push(now);
    messageTimestamps.set(key, timestamps);

    if (timestamps.length >= threshold) {
      await message.delete().catch(() => {});
      messageTimestamps.delete(key);
      await logAutomod(message, config, "Anti-Spam", `Sent ${threshold}+ messages in ${config.antiSpamInterval}s`);
      try {
        await member.timeout(60_000, "Auto-mod: spam detected");
      } catch {
        // may lack permission
      }
      return true;
    }
  }

  // ─── Anti-Flood (channel-wide rate limit) ──────────────
  if (config.antiFloodEnabled) {
    const channelKey = message.channelId;
    const now = Date.now();
    const interval = (config.antiSpamInterval || 5) * 1000;
    const threshold = (config.antiSpamThreshold || 5) * 3;

    let timestamps = channelFloodTimestamps.get(channelKey) || [];
    timestamps = timestamps.filter((t) => now - t < interval);
    timestamps.push(now);
    channelFloodTimestamps.set(channelKey, timestamps);

    if (timestamps.length >= threshold) {
      channelFloodTimestamps.delete(channelKey);
      await logAutomod(message, config, "Anti-Flood", `${threshold}+ messages in ${config.antiSpamInterval}s in channel`);
      try {
        if ("setRateLimitPerUser" in message.channel) {
          const textChannel = message.channel as TextChannel;
          const currentSlowmode = textChannel.rateLimitPerUser || 0;
          if (currentSlowmode < 10) {
            await textChannel.setRateLimitPerUser(10, "Auto-mod: flood detected");
            setTimeout(async () => {
              try {
                await textChannel.setRateLimitPerUser(currentSlowmode, "Auto-mod: flood cooldown expired");
              } catch {
                // ignore
              }
            }, 30_000);
          }
        }
      } catch {
        // may lack permission
      }
      return false;
    }
  }

  // ─── Anti-Caps ─────────────────────────────────────────
  const minCapsLength = config.antiCapsMinLength ?? 10;
  if (config.antiCapsEnabled && message.content.length > minCapsLength) {
    const threshold = config.antiCapsThreshold || 70;
    const letters = message.content.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 0) {
      const capsPercent = (letters.replace(/[^A-Z]/g, "").length / letters.length) * 100;
      if (capsPercent >= threshold) {
        await message.delete().catch(() => {});
        await logAutomod(message, config, "Anti-Caps", `${Math.round(capsPercent)}% uppercase (threshold: ${threshold}%)`);
        try {
          if ("send" in message.channel) {
            const warn = await message.channel.send({
              content: `<@${author.id}>, por favor no uses mayusculas en exceso.`,
            });
            setTimeout(() => warn.delete().catch(() => {}), 5000);
          }
        } catch {
          // ignore
        }
        return true;
      }
    }
  }

  // ─── Anti-Links ────────────────────────────────────────
  if (config.antiLinksEnabled) {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = message.content.match(urlRegex);
    if (urls && urls.length > 0) {
      const whitelist: string[] = config.antiLinksWhitelist || [];
      const hasBlockedUrl = urls.some((url: string) =>
        !whitelist.some((w: string) => url.toLowerCase().includes(w.toLowerCase())),
      );

      if (hasBlockedUrl) {
        await message.delete().catch(() => {});
        await logAutomod(message, config, "Anti-Links", `Blocked URL: ${urls[0]}`);
        try {
          if ("send" in message.channel) {
            const warn = await message.channel.send({
              content: `<@${author.id}>, los enlaces no estan permitidos en este canal.`,
            });
            setTimeout(() => warn.delete().catch(() => {}), 5000);
          }
        } catch {
          // ignore
        }
        return true;
      }
    }
  }

  // ─── Blacklisted Words ─────────────────────────────────
  if (config.blacklistEnabled && config.blacklistedWords?.length > 0) {
    const lowerContent = message.content.toLowerCase();
    const triggeredWord = config.blacklistedWords.find((w: string) =>
      lowerContent.includes(w.toLowerCase()),
    );

    if (triggeredWord) {
      await message.delete().catch(() => {});
      await logAutomod(message, config, "Blacklisted Word", `Triggered: ||${triggeredWord}||`);
      try {
        if ("send" in message.channel) {
          const warn = await message.channel.send({
            content: `<@${author.id}>, esa palabra no esta permitida aqui.`,
          });
          setTimeout(() => warn.delete().catch(() => {}), 5000);
        }
      } catch {
        // ignore
      }
      return true;
    }
  }

  return false;
}

/**
 * Send an automod log to the mod log channel.
 */
async function logAutomod(message: Message, config: any, type: string, details: string): Promise<void> {
  if (!config.modLogChannelId || !message.guild) return;

  try {
    const logChannel = message.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle(`AutoMod: ${type}`)
      .addFields(
        { name: "Usuario", value: `${message.author.username} (<@${message.author.id}>)`, inline: true },
        { name: "Canal", value: `<#${message.channelId}>`, inline: true },
        { name: "Detalles", value: details },
        { name: "Mensaje", value: message.content?.slice(0, 512) || "*vacio*" },
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`[AutoMod] Error sending log: ${err}`);
  }
}
