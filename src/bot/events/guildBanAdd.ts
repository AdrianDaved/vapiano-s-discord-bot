/**
 * guildBanAdd — Sends the SAME ban embed to both fixed log channels,
 * cross-bans in the linked server, and avoids duplicate posts.
 */
import { Events, GuildBan, EmbedBuilder, TextChannel, AuditLogEvent } from 'discord.js';
import { BotClient } from '../../shared/types';
import logger from '../../shared/logger';
import { pendingBans } from '../modules/moderation/pendingBans';

// Fixed ban-log channels — ban embeds ALWAYS go to both of these
const BAN_LOG_CHANNEL_IDS = ['1420854487945445499', '1483931180423184514'];

// Cross-ban: when a ban fires in guild A, also ban in guild B
const LINKED_GUILD: Record<string, string> = {
  '1107335281620820079': '1420045220325625898', // HubStore <-> Vapiano
  '1420045220325625898': '1107335281620820079',
};

// Guard: user IDs currently being cross-banned (to prevent double embed from the echo event)
const crossBanningNow = new Set<string>();

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan, client: BotClient) {
    const { guild, user } = ban;
    logger.info(`[BanLog] guildBanAdd: ${user.tag} in ${guild.name} (${guild.id})`);

    // Skip if this ban is the echo of our own cross-ban
    if (crossBanningNow.has(user.id)) {
      logger.info(`[BanLog] Skipping echo cross-ban event for ${user.tag}`);
      return;
    }

    // ── 1. Resolve reason + moderator ────────────────────────
    let reason      = ban.reason || 'Sin razon especificada';
    let moderatorId = '';

    // Check if this ban was triggered by a bot command — gives us the real moderator
    const pending = pendingBans.get(user.id);
    if (pending && pending.guildId === guild.id) {
      reason      = pending.reason;
      moderatorId = pending.moderatorId;
      pendingBans.delete(user.id);
      logger.info(`[BanLog] Resolved moderator from pendingBans: ${moderatorId}`);
    } else {
      // Fallback: audit log
      try {
        await new Promise(r => setTimeout(r, 1200));
        const logs  = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
        const entry = logs.entries.first();
        if (entry && entry.targetId === user.id) {
          if (entry.reason)   reason      = entry.reason;
          if (entry.executor) moderatorId = entry.executor.id;
        }
      } catch { /* audit log unavailable */ }
    }

    const modMention = moderatorId ? `<@${moderatorId}>` : 'Desconocido';

    // ── 2. Fetch full user profile to get banner ──────────────
    let bannerUrl: string | null = null;
    try {
      const fullUser = await client.users.fetch(user.id, { force: true });
      bannerUrl = fullUser.bannerURL({ size: 512 }) ?? null;
    } catch { /* no banner available */ }

    // ── 3. Build the embed ────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined })
      .setTitle('\u{1F6A8} USUARIO BANEADO')
      .setDescription(`**${user.username}** ha sido expulsado permanentemente del servidor.`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '\u{1F464} Usuario',             value: `<@${user.id}> \`${user.username}\``, inline: true },
        { name: '\u{1F6E1}\uFE0F Moderador',     value: modMention,                           inline: true },
        { name: '\u200b',                         value: '\u200b',                              inline: true },
        { name: '\u{1F4CB} Razon',               value: `\`\`\`${reason}\`\`\`` },
        { name: '\u{1F310} Servidor del baneo',  value: `**${guild.name}**` },
      )
      .setFooter({ text: `ID del usuario: ${user.id}` })
      .setTimestamp();

    if (bannerUrl) embed.setImage(bannerUrl);

    // ── 4. Send to BOTH fixed log channels ───────────────────
    const postedTo = new Set<string>();

    for (const channelId of BAN_LOG_CHANNEL_IDS) {
      if (postedTo.has(channelId)) continue;

      let ch: TextChannel | null = null;
      for (const g of client.guilds.cache.values()) {
        const found = g.channels.cache.get(channelId);
        if (found) { ch = found as TextChannel; break; }
        try {
          const fetched = await g.channels.fetch(channelId).catch(() => null);
          if (fetched) { ch = fetched as TextChannel; break; }
        } catch { /* not in this guild */ }
      }

      if (!ch) {
        logger.warn(`[BanLog] Channel ${channelId} not found in any guild`);
        continue;
      }

      try {
        await ch.send({ embeds: [embed] });
        postedTo.add(channelId);
        logger.info(`[BanLog] Sent ban embed to channel ${channelId} (${ch.guild.name})`);
      } catch (err) {
        logger.error(`[BanLog] Failed to send to ${channelId}: ${err}`);
      }
    }

    // ── 5. Cross-ban in the linked server ─────────────────────
    const otherGuildId = LINKED_GUILD[guild.id];
    if (!otherGuildId) return;

    const otherGuild = client.guilds.cache.get(otherGuildId);
    if (!otherGuild) {
      logger.warn(`[BanLog] Linked guild ${otherGuildId} not in cache`);
      return;
    }

    try {
      const already = await otherGuild.bans.fetch(user.id).catch(() => null);
      if (already) {
        logger.info(`[BanLog] ${user.tag} already banned in ${otherGuild.name}, skipping cross-ban`);
      } else {
        crossBanningNow.add(user.id);
        try {
          await otherGuild.bans.create(user.id, {
            reason: `[Ban cruzado desde ${guild.name}] ${reason}`,
          });
          logger.info(`[BanLog] Cross-banned ${user.tag} in ${otherGuild.name}`);
        } finally {
          setTimeout(() => crossBanningNow.delete(user.id), 5000);
        }
      }
    } catch (err) {
      logger.error(`[BanLog] Cross-ban failed in ${otherGuild.name}: ${err}`);
    }
  },
};
