import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
  Message,
} from 'discord.js';
import { moduleColor } from '../../utils';

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
      await new Promise(r => setTimeout(r, 100));
    }
    return count;
  }
}

async function purgeChannel(
  channel: TextChannel,
  opts: { limit: number; userId?: string; since: number },
): Promise<number> {
  const me = channel.guild.members.me;
  if (!me) return 0;
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionFlagsBits.ManageMessages) || !perms?.has(PermissionFlagsBits.ReadMessageHistory)) return 0;

  let fetched: Message[];
  try {
    const col = await channel.messages.fetch({ limit: 100 });
    fetched = [...col.values()];
  } catch { return 0; }

  const filtered = fetched.filter(m => {
    if (opts.since > 0 && m.createdTimestamp <= opts.since) return false;
    if (m.createdTimestamp < Date.now() - TWO_WEEKS_MS) return false;
    if (m.pinned) return false;
    if (opts.userId && m.author.id !== opts.userId) return false;
    return true;
  }).slice(0, opts.limit);

  return deleteBatch(channel, filtered);
}

export default {
  data: new SlashCommandBuilder()
    .setName('purgar')
    .setDescription('Eliminar mensajes de un usuario en todos los canales o en uno específico')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario cuyos mensajes eliminar').setRequired(false))
    .addStringOption(opt =>
      opt.setName('usuario_id').setDescription('ID del usuario (si ya no está en el servidor)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('tiempo').setDescription('Rango de tiempo: 30m · 2h · 6h · 1d · 7d · 14d').setRequired(false))
    .addIntegerOption(opt =>
      opt.setName('cantidad').setDescription('Máximo de mensajes por canal (1-100, por defecto 100)')
        .setMinValue(1).setMaxValue(100).setRequired(false))
    .addChannelOption(opt =>
      opt.setName('canal').setDescription('Canal específico (por defecto: todos los canales)')
        .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const guild       = interaction.guild!;
    const userMention = interaction.options.getUser('usuario');
    const userIdRaw   = interaction.options.getString('usuario_id')?.trim();
    const limit       = interaction.options.getInteger('cantidad') ?? 100;
    const tiempoStr   = interaction.options.getString('tiempo');
    const chanOpt     = interaction.options.getChannel('canal') as TextChannel | null;

    const userId = userMention?.id ?? userIdRaw ?? undefined;

    if (userIdRaw && !/^\d{17,20}$/.test(userIdRaw)) {
      await interaction.reply({ content: '❌ `usuario_id` inválido. Debe ser un número de 17-20 dígitos.', flags: 64 });
      return;
    }

    let since = 0;
    if (tiempoStr) {
      const ms = parseTime(tiempoStr);
      if (!ms) {
        await interaction.reply({ content: '❌ Formato de tiempo inválido. Usa: `30m`, `2h`, `1d`, `7d`, etc.', flags: 64 });
        return;
      }
      if (ms > TWO_WEEKS_MS) {
        await interaction.reply({ content: '❌ El rango máximo es 14 días (límite de Discord).', flags: 64 });
        return;
      }
      since = Date.now() - ms;
    }

    await interaction.deferReply({ flags: 64 });

    const opts = { limit, userId, since };

    // Canal específico
    if (chanOpt) {
      const deleted = await purgeChannel(chanOpt, opts);
      const embed = new EmbedBuilder()
        .setColor(moduleColor('moderation'))
        .setTitle('🗑️ Purga completada')
        .addFields(
          { name: '📊 Eliminados', value: `**${deleted}**`, inline: true },
          { name: '📁 Canal', value: `<#${chanOpt.id}>`, inline: true },
          ...(userId ? [{ name: '👤 Usuario', value: `<@${userId}>`, inline: true }] : []),
          ...(tiempoStr ? [{ name: '⏱️ Rango', value: `Últimos **${tiempoStr}**`, inline: true }] : []),
        )
        .setFooter({ text: `Ejecutado por ${interaction.user.username}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Todos los canales (por defecto)
    const channels = guild.channels.cache.filter(
      ch => ch.type === ChannelType.GuildText && (ch as TextChannel).viewable,
    ) as Map<string, TextChannel>;

    let total = 0;
    const results: string[] = [];

    for (const ch of channels.values()) {
      try {
        const deleted = await purgeChannel(ch, opts);
        if (deleted > 0) {
          total += deleted;
          results.push(`<#${ch.id}>: **${deleted}**`);
        }
      } catch { }
      await new Promise(r => setTimeout(r, 350));
    }

    const embed = new EmbedBuilder()
      .setColor(total > 0 ? moduleColor('moderation') : 0xfee75c)
      .setTitle('🗑️ Purga completada — todos los canales')
      .addFields(
        { name: '📊 Total eliminados', value: `**${total}**`, inline: true },
        { name: '📁 Canales revisados', value: `**${channels.size}**`, inline: true },
        ...(userId ? [{ name: '👤 Usuario', value: `<@${userId}>`, inline: true }] : []),
        ...(tiempoStr ? [{ name: '⏱️ Rango', value: `Últimos **${tiempoStr}**`, inline: true }] : []),
      )
      .setFooter({ text: `Ejecutado por ${interaction.user.username}` })
      .setTimestamp();

    if (results.length > 0) {
      embed.addFields({ name: '📋 Detalle', value: results.join('\n').slice(0, 1024) });
    } else {
      embed.setDescription('No se encontraron mensajes eliminables.');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
