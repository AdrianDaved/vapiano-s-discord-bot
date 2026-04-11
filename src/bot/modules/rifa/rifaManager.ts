import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
  ChannelType,
  PermissionOverwriteOptions,
  GuildMember,
} from 'discord.js';
import prisma from '../../../database/client';
import { getGuildConfig } from '../../utils';
import { cryptoSample } from '../../../shared/random';
import logger from '../../../shared/logger';
import { registerInterval } from '../timerRegistry';

const RIFA_COLOR   = 0xe91e8c;
const ENDED_COLOR  = 0x99aab5;
const WIN_COLOR    = 0xf1c40f;
const ERR_COLOR    = 0xed4245;
const OK_COLOR     = 0x57f287;

// ─── Slot helpers ─────────────────────────────────────────────

/** Devuelve los índices (0-based) de slots libres */
export function freeSlots(participants: string[]): number[] {
  return participants
    .map((v, i) => (v === '' ? i : -1))
    .filter((i) => i !== -1);
}

/** Cuántos slots están ocupados */
export function filledCount(participants: string[]): number {
  return participants.filter((v) => v !== '').length;
}

/** Inicializa un array de maxSlots cadenas vacías */
export function emptySlots(max: number): string[] {
  return new Array(max).fill('');
}

// ─── Embed builders ───────────────────────────────────────────

function formatCountdown(endsAt: Date | null): string {
  if (!endsAt) return 'Manual (staff)';
  const unix = Math.floor(endsAt.getTime() / 1000);
  return `<t:${unix}:R>`;
}

/** Tabla de puestos usando displayNames cacheados */
async function buildTable(
  participants: string[],
  guild: import('discord.js').Guild | null
): Promise<string> {
  const lines: string[] = ['Puesto │ Usuario', '───────┼────────────────────'];

  for (let i = 0; i < participants.length; i++) {
    const uid = participants[i];
    let name: string;
    if (!uid) {
      name = '(libre)';
    } else if (guild) {
      const m = guild.members.cache.get(uid) ?? await guild.members.fetch(uid).catch(() => null);
      name = m ? m.displayName : `ID:${uid.slice(-5)}`;
    } else {
      name = `ID:${uid.slice(-5)}`;
    }
    const puesto = String(i + 1).padStart(6, ' ');
    lines.push(`${puesto} │ ${name}`);
  }
  return lines.join('\n');
}

export function buildRifaEmbed(rifa: any, table?: string): EmbedBuilder {
  const filled = filledCount(rifa.participants);
  const isFull = filled >= rifa.maxSlots;

  const embed = new EmbedBuilder()
    .setColor(rifa.ended || rifa.cancelled ? ENDED_COLOR : RIFA_COLOR)
    .setTitle(
      `🎟️ RIFA${rifa.ended ? ' — FINALIZADA' : rifa.cancelled ? ' — CANCELADA' : ''}`
    )
    .setDescription(
      `**🏆 Premio:** ${rifa.prize}` +
      (rifa.description ? `\n> ${rifa.description}` : '') +
      (table ? `\n\`\`\`\n${table}\n\`\`\`` : '')
    )
    .addFields(
      { name: '👥 Participantes', value: `**${filled}** / ${rifa.maxSlots}`, inline: true },
      { name: '🎯 Ganadores',     value: `${rifa.winnersCount}`,              inline: true },
      { name: '⏰ Sorteo',         value: formatCountdown(rifa.endsAt),        inline: true },
      { name: '🎪 Organizador',    value: `<@${rifa.hostId}>`,                 inline: true },
      { name: '🔢 Slots libres',  value: freeSlots(rifa.participants).map(i => `#${i+1}`).slice(0,15).join(' ') || 'Ninguno', inline: true },
      { name: '🎫 Tickets',       value: 'Abierto para usuarios', inline: true },
    )
    .setFooter({
      text: rifa.ended
        ? 'Rifa finalizada'
        : rifa.cancelled
        ? 'Rifa cancelada'
        : isFull
        ? '¡Todos los slots llenos!'
        : 'Haz clic en el boton para solicitar tu numero al staff',
    })
    .setTimestamp();

  if (rifa.ended && rifa.winnerIds.length > 0) {
    embed
      .setColor(WIN_COLOR)
      .addFields({
        name: '🥇 Ganador(es)',
        value: rifa.winnerIds.map((id: string) => `<@${id}>`).join(', '),
      });
  }

  return embed;
}

export function buildRifaComponents(rifa: any): ActionRowBuilder<ButtonBuilder>[] {
  const filled = filledCount(rifa.participants);
  const isFull = filled >= rifa.maxSlots;
  const isOver = rifa.ended || rifa.cancelled;

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rifa_ticket_${rifa.id}`)
      .setLabel(isOver ? 'Rifa cerrada' : 'Solicitar mi numero (ticket al staff)')
      .setStyle(isOver ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(isOver),
    new ButtonBuilder()
      .setCustomId(`rifa_slots_${rifa.id}`)
      .setLabel(isFull ? 'Slots llenos' : `Participantes: ${filled}/${rifa.maxSlots}`)
      .setStyle(isFull ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(true),
  );

  return [row1];
}

// ─── Update Discord message ───────────────────────────────────

export async function updateRifaMessage(rifa: any, client: Client): Promise<void> {
  try {
    if (!rifa.messageId) return;
    const guild = client.guilds.cache.get(rifa.guildId);
    const channel = guild?.channels.cache.get(rifa.channelId) as TextChannel | undefined;
    const msg = await channel?.messages.fetch(rifa.messageId).catch(() => null);
    if (!msg) return;

    const table = await buildTable(rifa.participants, guild ?? null);
    const isOver = rifa.ended || rifa.cancelled;

    await msg.edit({
      embeds: [buildRifaEmbed(rifa, table)],
      components: isOver ? [] : buildRifaComponents(rifa),
    });
  } catch (err) {
    logger.warn(`[Rifa] Could not update message ${rifa.id}: ${err}`);
  }
}

// ─── Draw winners ─────────────────────────────────────────────

export async function drawWinners(
  rifaId: string,
  client: Client,
  forcedBy?: string
): Promise<void> {
  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.ended || rifa.cancelled) return;

  const real = rifa.participants.filter((p) => p !== '');
  const winners = cryptoSample(real, rifa.winnersCount);

  const updated = await prisma.rifa.update({
    where: { id: rifaId },
    data: { ended: true, winnerIds: winners, updatedAt: new Date() },
  });

  await updateRifaMessage(updated, client);

  try {
    const guild = client.guilds.cache.get(rifa.guildId);
    const channel = guild?.channels.cache.get(rifa.channelId) as TextChannel | undefined;
    if (!channel) return;

    if (winners.length > 0) {
      const mention = winners.map((w) => `<@${w}>`).join(', ');
      await channel.send({
        content: `🎉 ${mention}`,
        embeds: [
          new EmbedBuilder()
            .setColor(WIN_COLOR)
            .setTitle('🎟️ ¡Tenemos ganador(es)!')
            .setDescription(
              `**Premio:** ${rifa.prize}\n\n` +
              `🥇 **Ganador(es):** ${mention}\n` +
              `🎪 **Organizado por:** <@${rifa.hostId}>` +
              (forcedBy ? `\n🔧 **Sorteado por:** <@${forcedBy}>` : '')
            )
            .setTimestamp(),
        ],
      });
    } else {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(ENDED_COLOR)
            .setDescription(`La rifa de **${rifa.prize}** finalizó sin participantes.`)
            .setTimestamp(),
        ],
      });
    }
  } catch (err) {
    logger.error(`[Rifa] Error announcing winner ${rifaId}: ${err}`);
  }

  logger.info(`[Rifa] Ended ${rifaId} — winners: ${winners.join(', ')}`);
}

// ─── Button: Join (slot aleatorio) ───────────────────────────

export async function handleRifaJoin(interaction: ButtonInteraction): Promise<void> {
  // Self-join is disabled — only staff can assign via /rifa inscribir
  await interaction.reply({
    content: 'Para participar en la rifa, usa el boton de ticket y el staff te asignara un numero.',
    flags: 64,
  });
}

// ─── Button: Ticket para pedir número específico ─────────────

export async function handleRifaTicket(interaction: ButtonInteraction): Promise<void> {
  const rifaId = interaction.customId.replace('rifa_ticket_', '');
  if (!interaction.guild) return;

  const rifa = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!rifa || rifa.ended || rifa.cancelled) {
    await interaction.reply({ content: 'Esta rifa ya no está activa.', flags: 64 });
    return;
  }

  const guild = interaction.guild;
  const userId = interaction.user.id;
  const config = await getGuildConfig(guild.id);

  // Check if user already has an open rifa-channel
  const existingName = `rifa-${interaction.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const existingCh = guild.channels.cache.find(
    (ch) => ch.name.startsWith('rifa-') && (ch as any).topic?.includes(userId)
  );
  if (existingCh) {
    await interaction.reply({
      content: `Ya tienes un canal de solicitud abierto: <#${existingCh.id}>`,
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  // Determine category to use (ticket category or parent of current channel)
  const categoryId =
    config.rifaCategoryId ??
    config.ticketCategoryId ??
    (interaction.channel as TextChannel)?.parentId ??
    null;

  const staffRoles = ((config.rifaStaffRoleIds as string[]).length > 0
    ? config.rifaStaffRoleIds as string[]
    : config.ticketStaffRoleIds as string[]);

  // Build permission overwrites
  const overwrites: any[] = [
    { id: guild.roles.everyone.id,  deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  for (const roleId of staffRoles) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let ch: TextChannel;
  try {
    ch = await guild.channels.create({
      name: existingName,
      type: ChannelType.GuildText,
      parent: categoryId ?? undefined,
      topic: `Solicitud rifa | userId:${userId} | rifaId:${rifaId}`,
      permissionOverwrites: overwrites,
    }) as TextChannel;
  } catch (err) {
    await interaction.editReply({ content: '❌ No pude crear el canal. Verifica mis permisos.' });
    logger.error(`[Rifa] Could not create ticket channel: ${err}`);
    return;
  }

  // Build free slots string
  const freeList = freeSlots(rifa.participants)
    .map((i) => `#${i + 1}`)
    .join('  ');

  const staffPing = staffRoles
    .map((r) => `<@&${r}>`)
    .join(' ');

  await ch.send({
    content: staffPing ? `${staffPing} — solicitud de inscripción de <@${userId}>` : `Solicitud de inscripción de <@${userId}>`,
    embeds: [
      new EmbedBuilder()
        .setColor(RIFA_COLOR)
        .setTitle('🎟️ Solicitud de inscripción en rifa')
        .setDescription(
          `<@${userId}> quiere inscribirse en la rifa.\n\n` +
          `**🏆 Premio:** ${rifa.prize}\n` +
          `**👥 Participantes actuales:** ${filledCount(rifa.participants)} / ${rifa.maxSlots}\n` +
          `**🔢 Slots libres:** ${freeList || 'Ninguno'}\n\n` +
          `<@${userId}> — indica qué número quieres (ej: \`5\`) o escribe \`aleatorio\` para que te asignemos uno libre.`
        )
        .addFields({
          name: '✅ Para el staff',
          value: `Usa \`/rifa inscribir @usuario puesto:N\` aquí mismo para confirmar la inscripción.\nO usa \`/rifa quitar\` si se cancela.`,
        })
        .setFooter({ text: `Canal se puede cerrar con /ticket cerrar una vez terminado` })
        .setTimestamp(),
    ],
  });

  await interaction.editReply({
    content: `✅ Canal creado: <#${ch.id}>\nIndica ahí qué número quieres.`,
  });

  logger.info(`[Rifa] Ticket channel ${ch.id} created for user ${userId} — rifa ${rifaId}`);
}

// ─── Timer ────────────────────────────────────────────────────

export function initRifaTimer(client: Client): void {
  let tick = 0;
  registerInterval(async () => {
    tick++;
    try {
      const now = new Date();

      // Auto-end expired rifas
      const expired = await prisma.rifa.findMany({
        where: { ended: false, cancelled: false, endsAt: { lte: now } },
      });
      for (const r of expired) await drawWinners(r.id, client);

      // Refresh embeds every 5 minutes
      if (tick % 10 === 0) {
        const active = await prisma.rifa.findMany({
          where: { ended: false, cancelled: false, endsAt: { not: null } },
        });
        for (const r of active) await updateRifaMessage(r, client);
      }
    } catch (err) {
      logger.error(`[Rifa] Timer error: ${err}`);
    }
  }, 30_000);

  logger.info('[Rifa] Timer initialized');
}

// ─── Button: Panel ticket (desde dashboard) ───────────────────
// customId: rifa_panel_ticket_{guildId}_{categoryId}

// ─── Button: Panel ticket (desde dashboard) ───────────────────
export async function handleRifaPanelTicket(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const parts = interaction.customId.split('_');
  const categoryId = parts[parts.length - 1];
  const guild  = interaction.guild;
  const userId = interaction.user.id;
  const config = await getGuildConfig(guild.id);

  const existing = guild.channels.cache.find(
    (ch) => ch.name.startsWith('rifa-') && Boolean((ch as TextChannel).topic?.includes('userId:' + userId))
  );
  if (existing) {
    await interaction.reply({ content: 'Ya tienes un canal abierto: <#' + existing.id + '>', flags: 64 });
    return;
  }

  const activeRifa = await prisma.rifa.findFirst({
    where: { guildId: guild.id, ended: false, cancelled: false },
    orderBy: { createdAt: 'desc' },
  });

  await interaction.deferReply({ flags: 64 });

  const staffRoles: string[] = (config.rifaStaffRoleIds as string[]).length > 0
    ? config.rifaStaffRoleIds as string[]
    : config.ticketStaffRoleIds as string[];

  const overwrites: any[] = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  for (const roleId of staffRoles) {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const safeName = interaction.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '');
  const chanName = 'rifa-' + safeName;

  let ch: TextChannel;
  try {
    ch = await guild.channels.create({
      name: chanName,
      type: ChannelType.GuildText,
      parent: categoryId !== 'null' ? categoryId : undefined,
      topic: 'Solicitud rifa | userId:' + userId,
      permissionOverwrites: overwrites,
    }) as TextChannel;
  } catch (err) {
    await interaction.editReply({ content: 'No pude crear el canal. Verifica mis permisos.' });
    logger.error('[Rifa] Panel ticket error: ' + String(err));
    return;
  }

  const freeNums = activeRifa
    ? freeSlots(activeRifa.participants).map(i => String(i + 1)).slice(0, 20).join(', ') || 'Ninguno'
    : 'Sin rifa activa';

  const staffPing = staffRoles.map((r: string) => '<@&' + r + '>').join(' ');

  const prizeInfo = activeRifa
    ? 'Premio: ' + activeRifa.prize + '\nSlots libres: ' + freeNums + '\n\nEscribe el numero que deseas (ej: 5) o "aleatorio".'
    : 'No hay ninguna rifa activa ahora mismo. El staff te avisara cuando haya una.';

  await ch.send({
    content: staffPing || undefined,
    embeds: [
      new EmbedBuilder()
        .setColor(RIFA_COLOR)
        .setTitle('Solicitud de numero de rifa')
        .setDescription('Hola <@' + userId + '>!\n\n' + prizeInfo)
        .addFields({ name: 'Para el staff', value: 'Usa /rifa inscribir @usuario puesto:N para confirmar. Cierra el canal cuando termines.' })
        .setFooter({ text: 'Vapiano Bot | Rifas' })
        .setTimestamp(),
    ],
  });

  await interaction.editReply({ content: 'Canal creado: <#' + ch.id + '>' });
  logger.info('[Rifa] Panel ticket ' + ch.id + ' for ' + userId);
}
