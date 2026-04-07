/**
 * /hackeado — Aísla a un usuario comprometido:
 *  1. Aplica aislamiento (por defecto 1h, configurable)
 *  2. Borra sus mensajes recientes en TODOS los canales (por defecto últimos 30 min)
 *  3. Manda log al canal de mod con resumen de lo ocurrido
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
  GuildMember,
  Message,
} from 'discord.js';
import { getGuildConfig } from '../../utils';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function parseTime(str: string): number | null {
  const m = str.trim().match(/^(\d+)(m|h|d)$/i);
  if (!m) return null;
  const n = parseInt(m[1]);
  switch (m[2].toLowerCase()) {
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
  }
  return null;
}

async function deleteBatch(channel: TextChannel, messages: Message[]): Promise<number> {
  if (messages.length === 0) return 0;
  if (messages.length === 1) {
    try { await messages[0].delete(); return 1; } catch { return 0; }
  }
  try {
    const result = await channel.bulkDelete(messages, true);
    return result.size;
  } catch {
    let count = 0;
    for (const msg of messages) {
      try { await msg.delete(); count++; } catch { }
      await new Promise(r => setTimeout(r, 80));
    }
    return count;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('hackeado')
    .setDescription('Aísla a un usuario comprometido: aislamiento + borra mensajes recientes en todos los canales')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario que fue hackeado').setRequired(true))
    .addStringOption(opt =>
      opt.setName('mensajes').setDescription('Rango de tiempo de mensajes a borrar (por defecto: 30m)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('aislamiento').setDescription('Duración del aislamiento (por defecto: 1h)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('razon').setDescription('Razón adicional (por defecto: cuenta comprometida/hackeada)').setRequired(false)),

  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    const guild      = interaction.guild!;
    const target     = interaction.options.getUser('usuario', true);
    const mensajesStr = interaction.options.getString('mensajes') ?? '30m';
    const aislamientoStr  = interaction.options.getString('aislamiento') ?? '1h';
    const razonExtra  = interaction.options.getString('razon') ?? 'cuenta comprometida/hackeada';

    const msgMs = parseTime(mensajesStr);
    if (!msgMs) {
      await interaction.reply({ content: '❌ Formato de tiempo de mensajes inválido. Usa `30m`, `2h`, etc.', flags: 64 });
      return;
    }
    if (msgMs > TWO_WEEKS_MS) {
      await interaction.reply({ content: '❌ El rango máximo para borrar mensajes es 14 días.', flags: 64 });
      return;
    }

    const aislamientoMs = parseTime(aislamientoStr);
    if (!aislamientoMs || aislamientoMs > 28 * 24 * 60 * 60 * 1000) {
      await interaction.reply({ content: '❌ Duración de aislamiento inválida. Máximo 28 días.', flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const razon = `[HACKEADO] ${razonExtra}`;
    const since = Date.now() - msgMs;

    // ── 1. Aislamiento ─────────────────────────────────────────────
    let aislamientoOk = false;
    let aislamientoError = '';
    try {
      const member = await guild.members.fetch(target.id).catch(() => null) as GuildMember | null;
      if (!member) {
        aislamientoError = 'El usuario no está en el servidor.';
      } else if (!member.moderatable) {
        aislamientoError = 'No tengo permisos para silenciar a este usuario (jerarquía).';
      } else {
        await member.timeout(aislamientoMs, razon);
        aislamientoOk = true;
      }
    } catch (e: any) {
      aislamientoError = e?.message ?? 'Error desconocido al aplicar aislamiento.';
    }

    // ── 2. Borrar mensajes en todos los canales ────────────────
    const channels = guild.channels.cache.filter(
      ch => ch.type === ChannelType.GuildText && (ch as TextChannel).viewable,
    ) as Map<string, TextChannel>;

    let totalDeleted = 0;
    const channelResults: string[] = [];

    for (const ch of channels.values()) {
      try {
        const me = guild.members.me;
        const perms = ch.permissionsFor(me!);
        if (!perms?.has(PermissionFlagsBits.ManageMessages) || !perms?.has(PermissionFlagsBits.ReadMessageHistory)) continue;

        const col = await ch.messages.fetch({ limit: 100 }).catch(() => null);
        if (!col) continue;

        const toDelete = [...col.values()].filter(m =>
          m.author.id === target.id &&
          m.createdTimestamp > since &&
          m.createdTimestamp > Date.now() - TWO_WEEKS_MS &&
          !m.pinned,
        );

        if (toDelete.length === 0) continue;

        const deleted = await deleteBatch(ch, toDelete);
        if (deleted > 0) {
          totalDeleted += deleted;
          channelResults.push(`<#${ch.id}>: **${deleted}**`);
        }
      } catch { }
      await new Promise(r => setTimeout(r, 300));
    }

    // ── 3. Log al canal de moderación ──────────────────────────
    const config = await getGuildConfig(guild.id);
    const logChannelId = config.modLogChannelId;

    const logEmbed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⚠️ CUENTA COMPROMETIDA — ACCIÓN TOMADA')
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Usuario', value: `<@${target.id}> \`${target.username}\``, inline: true },
        { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '⏳ Aislamiento', value: aislamientoOk ? `✅ Aplicado por **${aislamientoStr}**` : `❌ ${aislamientoError}`, inline: true },
        { name: '🗑️ Mensajes borrados', value: `**${totalDeleted}** en los últimos **${mensajesStr}**`, inline: true },
        { name: '📁 Canales afectados', value: `**${channelResults.length}**`, inline: true },
        { name: '📋 Razón', value: razonExtra },
      )
      .setFooter({ text: `ID: ${target.id}` })
      .setTimestamp();

    if (channelResults.length > 0) {
      logEmbed.addFields({ name: '📋 Detalle de mensajes borrados', value: channelResults.join('\n').slice(0, 1024) });
    }

    if (logChannelId) {
      try {
        const logCh = guild.channels.cache.get(logChannelId) as TextChannel;
        if (logCh) await logCh.send({ embeds: [logEmbed] });
      } catch { }
    }

    // ── 4. Respuesta al moderador ──────────────────────────────
    const summaryEmbed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⚠️ Cuenta comprometida — acciones aplicadas')
      .addFields(
        { name: '👤 Usuario', value: `<@${target.id}> \`${target.username}\``, inline: true },
        { name: '⏳ Aislamiento', value: aislamientoOk ? `✅ **${aislamientoStr}**` : `❌ ${aislamientoError}`, inline: true },
        { name: '🗑️ Mensajes borrados', value: `**${totalDeleted}** (últimos **${mensajesStr}**)`, inline: true },
      )
      .setFooter({ text: 'El log completo fue enviado al canal de moderación' })
      .setTimestamp();

    await interaction.editReply({ embeds: [summaryEmbed] });
  },
};
