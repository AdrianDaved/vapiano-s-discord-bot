import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
  AttachmentBuilder,
} from 'discord.js';
import prisma from '../../../database/client';
import {
  buildRifaEmbed,
  buildRifaComponents,
  updateRifaMessage,
  drawWinners,
  freeSlots,
  filledCount,
  emptySlots,
} from '../../modules/rifa/rifaManager';

const RIFA_COLOR = 0xe91e8c;
const ERR_COLOR  = 0xed4245;
const OK_COLOR   = 0x57f287;
const INFO_COLOR = 0x3498db;

function parseDuration(str: string): number | null {
  const m = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return null;
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(m[1]) * mult[m[2].toLowerCase()] * 1000;
}

function isStaff(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('rifa')
    .setDescription('Sistema completo de rifas')

    // ── Crear ─────────────────────────────────────
    .addSubcommand((s) =>
      s.setName('crear').setDescription('Crear una nueva rifa')
        .addStringOption((o) => o.setName('premio').setDescription('Premio de la rifa').setRequired(true))
        .addIntegerOption((o) => o.setName('limite').setDescription('Número máximo de participantes').setRequired(true).setMinValue(2).setMaxValue(500))
        .addIntegerOption((o) => o.setName('ganadores').setDescription('Cantidad de ganadores (def: 1)').setMinValue(1).setMaxValue(20))
        .addStringOption((o) => o.setName('duracion').setDescription('Duración: 30m, 2h, 1d (vacío = manual)'))
        .addStringOption((o) => o.setName('descripcion').setDescription('Descripción adicional'))
        .addChannelOption((o) => o.setName('canal').setDescription('Canal donde publicar'))
        .addBooleanOption((o) => o.setName('auto-sortear').setDescription('Sortear al llenarse los slots (def: no)'))
        .addBooleanOption((o) => o.setName('auto-join').setDescription('Usuarios se inscriben solos (def: sí)'))
    )

    // ── Inscribir ─────────────────────────────────
    .addSubcommand((s) =>
      s.setName('inscribir').setDescription('Inscribir a un usuario (staff)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario a inscribir').setRequired(true))
        .addIntegerOption((o) => o.setName('puesto').setDescription('Número de puesto específico (vacío = primer libre)').setMinValue(1))
    )

    // ── Quitar ────────────────────────────────────
    .addSubcommand((s) =>
      s.setName('quitar').setDescription('Quitar a un usuario de la rifa (staff)')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuario a quitar').setRequired(true))
    )

    // ── Listar ────────────────────────────────────
    .addSubcommand((s) =>
      s.setName('listar').setDescription('Ver la tabla de participantes de la rifa activa')
    )

    // ── Info ──────────────────────────────────────
    .addSubcommand((s) =>
      s.setName('info').setDescription('Resumen de la rifa activa')
    )

    // ── Sortear ───────────────────────────────────
    .addSubcommand((s) =>
      s.setName('sortear').setDescription('Realizar el sorteo manualmente (staff)')
    )

    // ── Reroll ────────────────────────────────────
    .addSubcommand((s) =>
      s.setName('reroll').setDescription('Repetir el sorteo de la última rifa (staff)')
    )

    // ── Cancelar ──────────────────────────────────
    .addSubcommand((s) =>
      s.setName('cancelar').setDescription('Cancelar la rifa activa (staff)')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo de la cancelación'))
    )

    // ── Historial ─────────────────────────────────
    .addSubcommand((s) =>
      s.setName('historial').setDescription('Ver las últimas rifas realizadas')
    ),

  module: 'rifa',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const member  = interaction.member as GuildMember;

    // ══════════════════════════════════════════════
    // CREAR
    // ══════════════════════════════════════════════
    if (sub === 'crear') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede crear rifas.', flags: 64 });
        return;
      }

      const existing = await prisma.rifa.findFirst({ where: { guildId, ended: false, cancelled: false } });
      if (existing) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(ERR_COLOR).setDescription('⚠️ Ya hay una rifa activa. Cancélala o sortéala primero.')],
          flags: 64,
        });
        return;
      }

      const prize         = interaction.options.getString('premio', true);
      const maxSlots      = interaction.options.getInteger('limite', true);
      const winnersCount  = interaction.options.getInteger('ganadores') ?? 1;
      const durationStr   = interaction.options.getString('duracion');
      const description   = interaction.options.getString('descripcion');
      const targetChannel = (interaction.options.getChannel('canal') ?? interaction.channel) as TextChannel;
      const autoDrawOnFull = interaction.options.getBoolean('auto-sortear') ?? false;
      const allowSelfJoin  = interaction.options.getBoolean('auto-join') ?? true;

      let endsAt: Date | null = null;
      if (durationStr) {
        const ms = parseDuration(durationStr);
        if (!ms) {
          await interaction.reply({ content: 'Duración inválida. Ejemplo: `30m`, `2h`, `1d`', flags: 64 });
          return;
        }
        endsAt = new Date(Date.now() + ms);
      }

      await interaction.deferReply({ flags: 64 });

      const participants = emptySlots(maxSlots);

      const rifa = await prisma.rifa.create({
        data: {
          guildId,
          channelId: targetChannel.id,
          hostId: interaction.user.id,
          prize,
          description,
          maxSlots,
          winnersCount,
          endsAt,
          autoDrawOnFull,
          allowSelfJoin,
          participants,
        },
      });

      // Build initial table
      const tableLines = ['Puesto │ Usuario', '───────┼────────────────────'];
      for (let i = 0; i < maxSlots; i++) {
        tableLines.push(`${String(i + 1).padStart(6)} │ (libre)`);
      }
      const table = tableLines.join('\n');

      const msg = await targetChannel.send({
        embeds: [buildRifaEmbed(rifa, table)],
        components: buildRifaComponents(rifa),
      });

      await prisma.rifa.update({ where: { id: rifa.id }, data: { messageId: msg.id } });

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(OK_COLOR)
            .setTitle('✅ Rifa creada')
            .addFields(
              { name: '🏆 Premio',       value: prize,                                                              inline: true },
              { name: '👥 Slots',         value: `${maxSlots}`,                                                     inline: true },
              { name: '🎯 Ganadores',     value: `${winnersCount}`,                                                 inline: true },
              { name: '⏰ Duración',      value: endsAt ? `<t:${Math.floor(endsAt.getTime()/1000)}:R>` : 'Manual', inline: true },
              { name: '🔄 Auto-sortear', value: autoDrawOnFull ? 'Sí' : 'No',                                      inline: true },
              { name: '🎫 Auto-join',    value: allowSelfJoin ? 'Sí' : 'No',                                       inline: true },
              { name: '📢 Canal',        value: `<#${targetChannel.id}>`,                                           inline: true },
            ),
        ],
      });
      return;
    }

    // Rifa activa (necesaria para los demás subcomandos)
    const activeRifa = await prisma.rifa.findFirst({
      where: { guildId, ended: false, cancelled: false },
      orderBy: { createdAt: 'desc' },
    });

    // ══════════════════════════════════════════════
    // INSCRIBIR
    // ══════════════════════════════════════════════
    if (sub === 'inscribir') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede inscribir usuarios.', flags: 64 });
        return;
      }
      if (!activeRifa) {
        await interaction.reply({ content: 'No hay ninguna rifa activa.', flags: 64 });
        return;
      }

      const target     = interaction.options.getUser('usuario', true);
      const puestoOpt  = interaction.options.getInteger('puesto'); // 1-based o null
      const parts      = [...activeRifa.participants];

      // Check if user is already inscribed
      if (parts.includes(target.id)) {
        await interaction.reply({ content: `<@${target.id}> ya está inscrito en la rifa.`, flags: 64 });
        return;
      }

      let assignedIndex: number;

      if (puestoOpt !== null) {
        // ─ Slot específico ─
        const idx = puestoOpt - 1;
        if (idx < 0 || idx >= activeRifa.maxSlots) {
          await interaction.reply({ content: `❌ El puesto debe estar entre 1 y ${activeRifa.maxSlots}.`, flags: 64 });
          return;
        }
        if (parts[idx] !== '') {
          const current = parts[idx];
          await interaction.reply({
            content: `❌ El puesto **#${puestoOpt}** ya está ocupado por <@${current}>.`,
            flags: 64,
          });
          return;
        }
        parts[idx] = target.id;
        assignedIndex = idx;
      } else {
        // ─ Primer slot libre ─
        const freeIdx = parts.findIndex((v) => v === '');
        if (freeIdx === -1) {
          await interaction.reply({ content: '¡Los slots están llenos!', flags: 64 });
          return;
        }
        parts[freeIdx] = target.id;
        assignedIndex = freeIdx;
      }

      const updated = await prisma.rifa.update({
        where: { id: activeRifa.id },
        data: { participants: parts, updatedAt: new Date() },
      });

      await updateRifaMessage(updated, interaction.client as any);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(OK_COLOR)
            .setDescription(
              `✅ <@${target.id}> inscrito en el puesto **#${assignedIndex + 1}** de la rifa **${activeRifa.prize}**.`
            ),
        ],
        flags: 64,
      });

      if (updated.autoDrawOnFull && filledCount(parts) >= updated.maxSlots) {
        setTimeout(() => drawWinners(updated.id, interaction.client as any, interaction.user.id), 3000);
      }
      return;
    }

    // ══════════════════════════════════════════════
    // QUITAR
    // ══════════════════════════════════════════════
    if (sub === 'quitar') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede quitar usuarios.', flags: 64 });
        return;
      }
      if (!activeRifa) {
        await interaction.reply({ content: 'No hay ninguna rifa activa.', flags: 64 });
        return;
      }

      const target = interaction.options.getUser('usuario', true);
      const idx    = activeRifa.participants.indexOf(target.id);

      if (idx === -1) {
        await interaction.reply({ content: `<@${target.id}> no está inscrito en la rifa.`, flags: 64 });
        return;
      }

      const parts = [...activeRifa.participants];
      const slot  = idx + 1;
      parts[idx] = '';

      const updated = await prisma.rifa.update({
        where: { id: activeRifa.id },
        data: { participants: parts, updatedAt: new Date() },
      });

      await updateRifaMessage(updated, interaction.client as any);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(OK_COLOR)
            .setDescription(`✅ <@${target.id}> quitado del puesto **#${slot}**. El slot queda libre.`),
        ],
        flags: 64,
      });
      return;
    }

    // ══════════════════════════════════════════════
    // LISTAR
    // ══════════════════════════════════════════════
    if (sub === 'listar') {
      const rifa = activeRifa ?? await prisma.rifa.findFirst({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
      });

      if (!rifa) {
        await interaction.reply({ content: 'No hay ninguna rifa en curso.', flags: 64 });
        return;
      }

      await interaction.deferReply({ flags: 64 });

      const guild = interaction.guild!;
      const lines: string[] = [`🎟️  Rifa: ${rifa.prize}`, ''];
      lines.push('Puesto │ Usuario');
      lines.push('───────┼────────────────────');

      for (let i = 0; i < rifa.participants.length; i++) {
        const uid = rifa.participants[i];
        let name: string;
        if (!uid) {
          name = '(libre)';
        } else {
          const m = guild.members.cache.get(uid) ?? await guild.members.fetch(uid).catch(() => null);
          name = m ? m.displayName : `ID:${uid.slice(-5)}`;
        }
        lines.push(`${String(i + 1).padStart(6)} │ ${name}`);
      }

      lines.push('');
      lines.push(`👥 Total: ${filledCount(rifa.participants)} / ${rifa.maxSlots} participantes`);
      if (rifa.endsAt) {
        lines.push(`⏰ Sorteo: <t:${Math.floor(rifa.endsAt.getTime()/1000)}:R>`);
      }

      const text = lines.join('\n');

      // Si la tabla es larga, enviarla como archivo .txt
      if (text.length > 1800) {
        const buf = Buffer.from(text, 'utf-8');
        await interaction.editReply({
          content: `📋 Lista completa de participantes (${rifa.prize}):`,
          files: [new AttachmentBuilder(buf, { name: 'participantes.txt' })],
        });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(RIFA_COLOR)
              .setTitle(`🎟️ Rifa actual: ${rifa.prize}`)
              .setDescription(`\`\`\`\n${lines.slice(2).join('\n')}\n\`\`\``)
              .setFooter({ text: `${filledCount(rifa.participants)} / ${rifa.maxSlots} participantes` }),
          ],
        });
      }
      return;
    }

    // ══════════════════════════════════════════════
    // INFO
    // ══════════════════════════════════════════════
    if (sub === 'info') {
      if (!activeRifa) {
        await interaction.reply({ content: 'No hay ninguna rifa activa.', flags: 64 });
        return;
      }

      const free = freeSlots(activeRifa.participants);

      const embed = new EmbedBuilder()
        .setColor(RIFA_COLOR)
        .setTitle('🎟️ Rifa activa — Información')
        .addFields(
          { name: '🏆 Premio',         value: activeRifa.prize,                                                               inline: false },
          { name: '👥 Participantes',  value: `${filledCount(activeRifa.participants)} / ${activeRifa.maxSlots}`,              inline: true  },
          { name: '🎯 Ganadores',      value: `${activeRifa.winnersCount}`,                                                    inline: true  },
          { name: '🔢 Slots libres',   value: `${free.length} (${free.slice(0,10).map(i=>`#${i+1}`).join(' ')})`,             inline: false },
          { name: '⏰ Sorteo',          value: activeRifa.endsAt ? `<t:${Math.floor(activeRifa.endsAt.getTime()/1000)}:R>` : 'Manual', inline: true },
          { name: '🎪 Organizador',    value: `<@${activeRifa.hostId}>`,                                                       inline: true  },
          { name: '🔄 Auto-sortear',  value: activeRifa.autoDrawOnFull ? 'Al llenarse' : 'No',                                inline: true  },
          { name: '🎫 Auto-join',     value: activeRifa.allowSelfJoin ? 'Sí' : 'No',                                          inline: true  },
          { name: '📢 Canal',          value: `<#${activeRifa.channelId}>`,                                                    inline: true  },
          { name: '📅 Creada',         value: `<t:${Math.floor(activeRifa.createdAt.getTime()/1000)}:f>`,                     inline: true  },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });
      return;
    }

    // ══════════════════════════════════════════════
    // SORTEAR
    // ══════════════════════════════════════════════
    if (sub === 'sortear') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede sortear.', flags: 64 });
        return;
      }
      if (!activeRifa) {
        await interaction.reply({ content: 'No hay ninguna rifa activa.', flags: 64 });
        return;
      }
      if (filledCount(activeRifa.participants) === 0) {
        await interaction.reply({ content: 'No hay participantes en la rifa.', flags: 64 });
        return;
      }

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(RIFA_COLOR).setDescription('🎰 Realizando el sorteo...')],
        flags: 64,
      });
      await drawWinners(activeRifa.id, interaction.client as any, interaction.user.id);
      return;
    }

    // ══════════════════════════════════════════════
    // REROLL
    // ══════════════════════════════════════════════
    if (sub === 'reroll') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede hacer reroll.', flags: 64 });
        return;
      }

      const last = await prisma.rifa.findFirst({
        where: { guildId, ended: true, cancelled: false },
        orderBy: { updatedAt: 'desc' },
      });

      if (!last) {
        await interaction.reply({ content: 'No hay ninguna rifa finalizada.', flags: 64 });
        return;
      }

      const real = last.participants.filter((p) => p !== '');
      const shuffled = [...real].sort(() => Math.random() - 0.5);
      const newWinners = shuffled.slice(0, Math.min(last.winnersCount, shuffled.length));

      await prisma.rifa.update({ where: { id: last.id }, data: { winnerIds: newWinners } });

      const ch = interaction.guild!.channels.cache.get(last.channelId) as TextChannel | undefined;
      if (ch && newWinners.length > 0) {
        const mention = newWinners.map((w) => `<@${w}>`).join(', ');
        await ch.send({
          content: `🔄 ${mention}`,
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle('🔄 Reroll — Nuevos ganadores')
              .setDescription(`**Premio:** ${last.prize}\n\n🥇 **Ganador(es):** ${mention}\n🔧 **Reroll por:** <@${interaction.user.id}>`)
              .setTimestamp(),
          ],
        });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(OK_COLOR)
            .setDescription(
              `✅ Reroll de **${last.prize}**\n🥇 Nuevos ganadores: ${newWinners.map(w=>`<@${w}>`).join(', ') || 'Ninguno'}`
            ),
        ],
        flags: 64,
      });
      return;
    }

    // ══════════════════════════════════════════════
    // CANCELAR
    // ══════════════════════════════════════════════
    if (sub === 'cancelar') {
      if (!isStaff(member)) {
        await interaction.reply({ content: 'Solo el staff puede cancelar rifas.', flags: 64 });
        return;
      }
      if (!activeRifa) {
        await interaction.reply({ content: 'No hay ninguna rifa activa.', flags: 64 });
        return;
      }

      const reason = interaction.options.getString('motivo') ?? 'Sin motivo';
      const cancelled = await prisma.rifa.update({
        where: { id: activeRifa.id },
        data: { cancelled: true, updatedAt: new Date() },
      });

      await updateRifaMessage(cancelled, interaction.client as any);

      const ch = interaction.guild!.channels.cache.get(activeRifa.channelId) as TextChannel | undefined;
      if (ch) {
        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setColor(ERR_COLOR)
              .setTitle('❌ Rifa cancelada')
              .setDescription(
                `**Premio:** ${activeRifa.prize}\n**Motivo:** ${reason}\n**Cancelada por:** <@${interaction.user.id}>`
              )
              .setTimestamp(),
          ],
        });
      }

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(OK_COLOR).setDescription(`✅ Rifa **${activeRifa.prize}** cancelada.`)],
        flags: 64,
      });
      return;
    }

    // ══════════════════════════════════════════════
    // HISTORIAL
    // ══════════════════════════════════════════════
    if (sub === 'historial') {
      const history = await prisma.rifa.findMany({
        where: { guildId, OR: [{ ended: true }, { cancelled: true }] },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      if (history.length === 0) {
        await interaction.reply({ content: 'No hay rifas en el historial.', flags: 64 });
        return;
      }

      const embed = new EmbedBuilder().setColor(INFO_COLOR).setTitle('📋 Historial de rifas (últimas 5)').setTimestamp();

      for (const r of history) {
        const status  = r.cancelled ? '❌ Cancelada' : '✅ Finalizada';
        const winners = r.winnerIds.length > 0 ? r.winnerIds.map((w) => `<@${w}>`).join(', ') : 'Ninguno';
        embed.addFields({
          name: `${status} — ${r.prize}`,
          value:
            `👥 ${filledCount(r.participants)}/${r.maxSlots} participantes` +
            (r.ended ? `\n🥇 ${winners}` : '') +
            `\n📅 <t:${Math.floor(r.updatedAt.getTime() / 1000)}:f>`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], flags: 64 });
      return;
    }
  },
};
