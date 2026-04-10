/**
 * guildBanAdd — Each guild sends its OWN ban embed to its OWN log channel.
 * Cross-ban: bans the user in the linked server and sends a separate cross-ban embed there.
 * Works even if the user is not a member of the linked server.
 */
import { Events, GuildBan, EmbedBuilder, TextChannel, AuditLogEvent } from 'discord.js';
import { BotClient } from '../../shared/types';
import logger from '../../shared/logger';
import { pendingBans } from '../modules/moderation/pendingBans';

// Each guild's own ban log channel
const GUILD_BAN_LOG: Record<string, string> = {
  '1420045220325625898': '1420854487945445499', // Vapiano → its ban log channel
  '1107335281620820079': '1483931180423184514', // HubStore → its ban log channel
};

// Cross-ban links
const LINKED_GUILD: Record<string, string> = {
  '1107335281620820079': '1420045220325625898',
  '1420045220325625898': '1107335281620820079',
};

// Guard against double-processing the echo event from our own cross-ban
const crossBanningNow = new Set<string>();

async function sendToChannel(client: BotClient, channelId: string, payload: any): Promise<void> {
  let ch: TextChannel | null = null;
  for (const g of client.guilds.cache.values()) {
    const found = g.channels.cache.get(channelId) ?? await g.channels.fetch(channelId).catch(() => null);
    if (found) { ch = found as TextChannel; break; }
  }
  if (!ch) { logger.warn(`[BanLog] Channel ${channelId} not found`); return; }
  await ch.send(payload).catch((err) => logger.error(`[BanLog] Failed to send to ${channelId}: ${err}`));
  logger.info(`[BanLog] Sent to channel ${channelId} (${ch.guild.name})`);
}

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan, client: BotClient) {
    const { guild, user } = ban;
    logger.info(`[BanLog] guildBanAdd: ${user.tag} in ${guild.name} (${guild.id})`);

    // If this is our own cross-ban echo, skip everything — the embed was already sent below
    if (crossBanningNow.has(user.id)) {
      logger.info(`[BanLog] Skipping echo for ${user.tag}`);
      return;
    }

    // ── 1. Resolve reason + moderator ────────────────────────
    let reason      = ban.reason || 'Sin razon especificada';
    let moderatorId = '';

    const pending = pendingBans.get(user.id);
    if (pending && pending.guildId === guild.id) {
      reason      = pending.reason;
      moderatorId = pending.moderatorId;
      pendingBans.delete(user.id);
      logger.info(`[BanLog] Moderator from pendingBans: ${moderatorId}`);
    } else {
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

    // ── 2. Fetch user banner ──────────────────────────────────
    let bannerUrl: string | null = null;
    try {
      const fullUser = await client.users.fetch(user.id, { force: true });
      bannerUrl = fullUser.bannerURL({ size: 512 }) ?? null;
    } catch { /* no banner */ }

    // ── 3. Build and send the ORIGIN embed ───────────────────
    const originEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined })
      .setTitle('🚨 USUARIO BANEADO')
      .setDescription(`**${user.username}** ha sido expulsado permanentemente del servidor.`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Usuario',            value: `<@${user.id}> \`${user.username}\``, inline: true },
        { name: '🛡️ Moderador',          value: modMention,                           inline: true },
        { name: '\u200b',                 value: '\u200b',                              inline: true },
        { name: '📋 Razon',              value: `\`\`\`${reason}\`\`\`` },
        { name: '🌐 Servidor del baneo', value: `**${guild.name}**` },
      )
      .setFooter({ text: `ID del usuario: ${user.id}` })
      .setTimestamp();

    if (bannerUrl) originEmbed.setImage(bannerUrl);

    // Send to this guild's own log channel
    const originLogChannelId = GUILD_BAN_LOG[guild.id];
    if (originLogChannelId) {
      await sendToChannel(client, originLogChannelId, { embeds: [originEmbed] });
    } else {
      logger.warn(`[BanLog] No log channel configured for guild ${guild.id}`);
    }

    // ── 4. Cross-ban in linked server ────────────────────────
    const otherGuildId = LINKED_GUILD[guild.id];
    if (!otherGuildId) return;

    const otherGuild = client.guilds.cache.get(otherGuildId);
    if (!otherGuild) {
      logger.warn(`[BanLog] Linked guild ${otherGuildId} not in cache`);
      return;
    }

    // Perform the cross-ban (works even if user is not a member)
    try {
      const already = await otherGuild.bans.fetch(user.id).catch(() => null);
      if (already) {
        logger.info(`[BanLog] ${user.tag} already banned in ${otherGuild.name}`);
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
      return;
    }

    // ── 5. Send cross-ban embed to the OTHER guild's log channel ──
    const crossEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setAuthor({ name: otherGuild.name, iconURL: otherGuild.iconURL({ size: 64 }) ?? undefined })
      .setTitle('🚨 BAN CRUZADO — USUARIO BANEADO')
      .setDescription(`**${user.username}** fue baneado en **${guild.name}** y baneado automáticamente en este servidor.`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Usuario',              value: `<@${user.id}> \`${user.username}\``, inline: true },
        { name: '🛡️ Moderador',            value: modMention,                           inline: true },
        { name: '\u200b',                   value: '\u200b',                              inline: true },
        { name: '📋 Razon',                value: `\`\`\`${reason}\`\`\`` },
        { name: '🌐 Servidor del baneo',   value: `**${guild.name}**` },
        { name: '🔗 Baneado también en',   value: `**${otherGuild.name}**` },
      )
      .setFooter({ text: `ID del usuario: ${user.id}` })
      .setTimestamp();

    if (bannerUrl) crossEmbed.setImage(bannerUrl);

    const crossLogChannelId = GUILD_BAN_LOG[otherGuildId];
    if (crossLogChannelId) {
      await sendToChannel(client, crossLogChannelId, { embeds: [crossEmbed] });
    }
  },
};
