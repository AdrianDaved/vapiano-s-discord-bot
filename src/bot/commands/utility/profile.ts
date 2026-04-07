import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  GuildMember,
  ButtonInteraction,
} from 'discord.js';
import prisma from '../../../database/client';
import { getGlobalRep, getGlobalGiven, getGlobalRank, LINKED_GUILD_IDS } from '../../modules/reputation/globalRep';

const REPS_PER_PAGE = 5;

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 60)   return `hace ${mins}m`;
  if (hours < 24)  return `hace ${hours}h`;
  if (days < 30)   return `hace ${days}d`;
  return `el ${date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function progressBar(value: number, max: number, length = 10): string {
  const filled = max > 0 ? Math.round((value / max) * length) : 0;
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

async function buildProfileEmbed(target: GuildMember, requesterId: string) {
  const userId = target.user.id;
  const guildId = target.guild.id;

  // Parallel data fetch
  const [repTotal, repGiven, repRank, repServer, warnings, inviteCount, lastReps] = await Promise.all([
    getGlobalRep(userId),
    getGlobalGiven(userId),
    getGlobalRank(userId),
    prisma.reputation.count({ where: { guildId, userId } }),
    prisma.warning.count({ where: { guildId, userId } }),
    prisma.invite.count({ where: { guildId, inviterId: userId, fake: false, left: false } }),
    prisma.reputation.findMany({
      where: { guildId: { in: LINKED_GUILD_IDS }, userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { giverId: true, reason: true, createdAt: true },
    }),
  ]);

  // Highest role (exclude @everyone)
  const highestRole = target.roles.cache
    .filter(r => r.id !== target.guild.id)
    .sort((a, b) => b.position - a.position)
    .first();

  const color = highestRole?.color || 0x5865f2;
  const joinedTs   = target.joinedAt ? Math.floor(target.joinedAt.getTime() / 1000) : null;
  const accountTs  = Math.floor(target.user.createdTimestamp / 1000);
  const joinedDays = joinedTs ? Math.floor((Date.now() / 1000 - joinedTs) / 86400) : 0;
  const accountDays = Math.floor((Date.now() - target.user.createdTimestamp) / 86_400_000);

  // ── Rep block ────────────────────────────────────────────────────────────
  const bar = progressBar(repTotal, Math.max(repTotal, 50));
  const repDesc = [
    `✦ **${repTotal}** recibidas  ·  **${repGiven}** dadas` + (repRank > 0 ? `  ·  **#${repRank}** global` : ''),
    `\`${bar}\``,
  ].join('\n');

  // ── Trust indicators ─────────────────────────────────────────────────────
  const checks: string[] = [];
  checks.push(accountDays >= 365 ? '✅ Cuenta mayor a 1 año' : accountDays >= 30 ? '⚠️ Cuenta reciente (<1 año)' : '🔴 Cuenta muy nueva (<30 días)');
  checks.push(joinedDays  >= 180 ? '✅ En el servidor +6 meses' : joinedDays >= 30 ? '⚠️ Menos de 6 meses' : '🔴 Entró hace menos de 30 días');
  checks.push(repServer   >= 10  ? '✅ Buena reputación en este server' : repServer >= 1 ? '⚠️ Poca reputación en este server' : '⚪ Sin rep en este server');
  checks.push(warnings    === 0  ? '✅ Sin advertencias' : warnings <= 2 ? `⚠️ ${warnings} advertencia${warnings > 1 ? 's' : ''}` : `🔴 ${warnings} advertencias`);
  checks.push(inviteCount >= 3   ? '✅ Ha invitado miembros' : '⚪ Sin invitaciones registradas');

  // ── Last reps preview ────────────────────────────────────────────────────
  const repLines = lastReps.length > 0
    ? lastReps.map(r => {
        const reason = r.reason ? `"${r.reason}"` : '*sin razón*';
        return `◦ <@${r.giverId}> — ${reason} · ${timeAgo(r.createdAt)}`;
      }).join('\n')
    : '*Sin reps recibidas aún*';

  const SEP = { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: '\u200b', inline: false };

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: target.displayName,
      iconURL: target.user.displayAvatarURL({ size: 128 }),
    })
    .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
    .setDescription(repDesc)
    .addFields(
      SEP,
      {
        name: '🔗 Invitaciones',
        value: `**${inviteCount}** miembros`,
        inline: true,
      },
      {
        name: '🎖️ Rol más alto',
        value: highestRole ? `<@&${highestRole.id}>` : '*Ninguno*',
        inline: true,
      },
      {
        name: '🗓️ En el servidor',
        value: joinedTs ? `**${joinedDays}d** · <t:${joinedTs}:D>` : '*Desconocido*',
        inline: true,
      },
      {
        name: '📅 Cuenta de Discord',
        value: `<t:${accountTs}:D>`,
        inline: true,
      },
      {
        name: '⭐ Rep en este server',
        value: `**${repServer}** recibidas`,
        inline: true,
      },
      {
        name: '⚠️ Advertencias',
        value: warnings === 0 ? '*Ninguna*' : `**${warnings}**`,
        inline: true,
      },
      SEP,
      {
        name: '🔍 Indicadores de confianza',
        value: checks.join('\n'),
        inline: false,
      },
      SEP,
      {
        name: '💬 Últimas reps recibidas',
        value: repLines,
        inline: false,
      },
    )
    .setFooter({ text: `ID: ${userId}` })
    .setTimestamp();

  return { embed, repTotal, repGiven };
}

async function buildRepsEmbed(
  userId: string,
  mode: 'recibidas' | 'dadas',
  page: number,
  targetName: string,
) {
  const where = mode === 'recibidas'
    ? { guildId: { in: LINKED_GUILD_IDS }, userId }
    : { guildId: { in: LINKED_GUILD_IDS }, giverId: userId };

  const [total, reps] = await Promise.all([
    prisma.reputation.count({ where }),
    prisma.reputation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * REPS_PER_PAGE,
      take: REPS_PER_PAGE,
      select: { giverId: true, userId: true, reason: true, createdAt: true, guildId: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / REPS_PER_PAGE));
  const guildNames: Record<string, string> = {
    '1420045220325625898': 'Vapiano',
    '1107335281620820079': 'HubStore',
  };

  const lines = reps.map((r, i) => {
    const idx     = page * REPS_PER_PAGE + i + 1;
    const partner = mode === 'recibidas' ? `<@${r.giverId}>` : `<@${r.userId}>`;
    const reason  = r.reason ? `"${r.reason}"` : '_sin razón_';
    const server  = guildNames[r.guildId] ?? r.guildId;
    const time    = timeAgo(r.createdAt);
    return `\`${idx}.\` ${partner} — ${reason}\n    📍 ${server} • ${time}`;
  });

  const title = mode === 'recibidas'
    ? `⭐ Reps recibidas por ${targetName}`
    : `💝 Reps dadas por ${targetName}`;

  const embed = new EmbedBuilder()
    .setColor(mode === 'recibidas' ? 0xf59e0b : 0xec4899)
    .setTitle(title)
    .setDescription(lines.length > 0 ? lines.join('\n\n') : '_No hay registros._')
    .setFooter({ text: `Página ${page + 1} de ${totalPages} • ${total} en total` });

  return { embed, totalPages, total };
}

function buildProfileButtons(userId: string, repTotal: number, repGiven: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pf_recv_${userId}_0`)
      .setLabel(`Reps recibidas (${repTotal})`)
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`pf_give_${userId}_0`)
      .setLabel(`Reps dadas (${repGiven})`)
      .setEmoji('💝')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildNavButtons(userId: string, mode: 'recibidas' | 'dadas', page: number, totalPages: number) {
  const modeKey = mode === 'recibidas' ? 'recv' : 'give';
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pf_${modeKey}_${userId}_${page - 1}`)
      .setLabel('◀ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`pf_back_${userId}`)
      .setLabel('↩ Perfil')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pf_${modeKey}_${userId}_${page + 1}`)
      .setLabel('Siguiente ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Ver el perfil de un miembro del servidor')
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario a consultar (por defecto: tú mismo)').setRequired(false)
    ),
  cooldown: 5,
  module: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
    const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'No se encontró ese usuario en el servidor.', flags: 64 });
      return;
    }

    await interaction.deferReply();

    const { embed, repTotal, repGiven } = await buildProfileEmbed(member, interaction.user.id);
    const row = buildProfileButtons(member.user.id, repTotal, repGiven);

    const reply = await interaction.editReply({ embeds: [embed], components: [row] });

    // ── Button collector ───────────────────────────────────────────────────
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn: ButtonInteraction) => {
      const [, action, targetId, pageStr] = btn.customId.split('_');

      // Back to profile
      if (action === 'back') {
        const freshMember = await interaction.guild?.members.fetch(targetId).catch(() => member);
        const { embed: pe, repTotal: rt, repGiven: rg } = await buildProfileEmbed(freshMember ?? member, interaction.user.id);
        await btn.update({ embeds: [pe], components: [buildProfileButtons(targetId, rt, rg)] });
        return;
      }

      // Reps panel
      const mode: 'recibidas' | 'dadas' = action === 'recv' ? 'recibidas' : 'dadas';
      const page = parseInt(pageStr ?? '0', 10);
      const { embed: re, totalPages } = await buildRepsEmbed(targetId, mode, page, member.displayName);
      await btn.update({
        embeds: [re],
        components: [buildNavButtons(targetId, mode, page, totalPages)],
      });
    });

    collector.on('end', () => {
      const disabledRow = buildProfileButtons(member.user.id, repTotal, repGiven);
      disabledRow.components.forEach(b => b.setDisabled(true));
      reply.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
