import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import prisma from '../../../database/client';
import { parseDuration } from '../../utils';

// ── Helpers ────────────────────────────────────────────────────────────────

export function buildPollBar(percentage: number, length = 12): string {
  const filled = Math.round((percentage / 100) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

export function buildPollEmbed(
  poll: { id: string; question: string; options: string[]; votes: any; endsAt: Date | null; creatorId: string; allowedRoleIds?: string[] },
  ended = false,
): EmbedBuilder {
  const votes: Record<string, string[]> = (poll.votes as any) || {};
  const totalVotes = Object.values(votes).reduce((sum: number, arr: string[]) => sum + arr.length, 0);

  let maxVotes = 0;
  let winnerIdx = -1;
  if (ended && totalVotes > 0) {
    for (let i = 0; i < poll.options.length; i++) {
      const c = (votes[i.toString()] || []).length;
      if (c > maxVotes) { maxVotes = c; winnerIdx = i; }
    }
  }

  const description = poll.options
    .map((option: string, i: number) => {
      const count = (votes[i.toString()] || []).length;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const bar = buildPollBar(pct);
      const isWinner = ended && i === winnerIdx;
      return `**${i + 1}.** ${option}${isWinner ? ' 🏆' : ''}\n\`${bar}\` **${pct}%** · ${count} voto${count !== 1 ? 's' : ''}`;
    })
    .join('\n\n');

  const allowedRoles = poll.allowedRoleIds ?? [];
  const rolesText = allowedRoles.length > 0
    ? allowedRoles.map((id) => `<@&${id}>`).join(', ')
    : 'Todos';

  const embed = new EmbedBuilder()
    .setColor(ended ? 0x57f287 : 0x5865f2)
    .setAuthor({ name: ended ? '📊 Encuesta finalizada' : '📊 Encuesta activa' })
    .setTitle(poll.question)
    .setDescription(description)
    .addFields(
      { name: '🗳️ Votos', value: `**${totalVotes}**`, inline: true },
      { name: '👤 Creada por', value: `<@${poll.creatorId}>`, inline: true },
      {
        name: ended ? '🏁 Estado' : '⏳ Termina',
        value: ended
          ? '**Finalizada**'
          : poll.endsAt
          ? `<t:${Math.floor(poll.endsAt.getTime() / 1000)}:R>`
          : '**Sin límite**',
        inline: true,
      },
      { name: '🔒 Puede votar', value: rolesText, inline: false },
    )
    .setFooter({ text: `ID: ${poll.id.slice(0, 8)}` })
    .setTimestamp(ended ? new Date() : poll.endsAt || undefined);

  return embed;
}

export function buildPollRows(options: string[], pollId: string): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  for (let i = 0; i < options.length; i++) {
    if (i > 0 && i % 5 === 0) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll_${pollId}_${i}`)
        .setLabel(`${i + 1}. ${options[i].slice(0, 77)}`)
        .setStyle(ButtonStyle.Secondary),
    );
  }
  rows.push(row);
  return rows;
}

// ── Command ────────────────────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('encuesta')
    .setDescription('Crear y gestionar encuestas')
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Crear una nueva encuesta')
        .addStringOption((opt) =>
          opt.setName('pregunta').setDescription('Pregunta de la encuesta').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('opciones').setDescription('Opciones separadas por | (ej. Si | No | Tal vez)').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('duracion').setDescription('Duración (ej. 1h, 1d, 30m). Sin límite si se deja vacío'),
        )
        .addStringOption((opt) =>
          opt
            .setName('mencionar')
            .setDescription('Mencionar antes de la encuesta')
            .addChoices(
              { name: '@everyone', value: '@everyone' },
              { name: '@here', value: '@here' },
              { name: 'Ninguno', value: 'none' },
            ),
        )
        .addRoleOption((opt) =>
          opt.setName('rol1').setDescription('Rol que puede votar (dejar vacío = todos)'),
        )
        .addRoleOption((opt) =>
          opt.setName('rol2').setDescription('Rol adicional que puede votar'),
        )
        .addRoleOption((opt) =>
          opt.setName('rol3').setDescription('Rol adicional que puede votar'),
        )
        .addRoleOption((opt) =>
          opt.setName('rol4').setDescription('Rol adicional que puede votar'),
        )
        .addRoleOption((opt) =>
          opt.setName('rol5').setDescription('Rol adicional que puede votar'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('finalizar')
        .setDescription('Finalizar una encuesta activa')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID de la encuesta (primeros 8 caracteres)').setRequired(true),
        ),
    ),
  module: 'automation',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'crear': {
        const question    = interaction.options.getString('pregunta', true);
        const optionsStr  = interaction.options.getString('opciones', true);
        const durationStr = interaction.options.getString('duracion');
        const mentionOpt  = interaction.options.getString('mencionar') ?? 'none';

        // Collect up to 5 roles
        const allowedRoleIds: string[] = [];
        for (let n = 1; n <= 5; n++) {
          const role = interaction.options.getRole(`rol${n}`);
          if (role) allowedRoleIds.push(role.id);
        }

        const options = optionsStr.split('|').map((o) => o.trim()).filter((o) => o.length > 0);

        if (options.length < 2 || options.length > 10) {
          await interaction.reply({
            content: 'Debes proporcionar entre 2 y 10 opciones, separadas por `|`.',
            flags: 64,
          });
          return;
        }

        let endsAt: Date | null = null;
        if (durationStr) {
          const sec = parseDuration(durationStr);
          if (sec) endsAt = new Date(Date.now() + sec * 1000);
        }

        const poll = await prisma.poll.create({
          data: {
            guildId,
            channelId: interaction.channelId,
            question,
            options,
            creatorId: interaction.user.id,
            endsAt,
            votes: {},
            allowedRoleIds,
          },
        });

        const embed = buildPollEmbed(poll);
        const rows  = buildPollRows(options, poll.id);
        const mentionContent = mentionOpt !== 'none' ? mentionOpt : undefined;

        const reply = await interaction.reply({
          content: mentionContent,
          allowedMentions: mentionContent ? { parse: ['everyone'] } : { parse: [] },
          embeds: [embed],
          components: rows,
          fetchReply: true,
        });

        await prisma.poll.update({
          where: { id: poll.id },
          data: { messageId: reply.id },
        });

        break;
      }

      case 'finalizar': {
        const id = interaction.options.getString('id', true);

        const poll = await prisma.poll.findFirst({
          where: { id: { startsWith: id }, guildId, ended: false },
        });

        if (!poll) {
          await interaction.reply({ content: 'Encuesta no encontrada o ya finalizada.', flags: 64 });
          return;
        }

        if (
          poll.creatorId !== interaction.user.id &&
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)
        ) {
          await interaction.reply({
            content: 'Solo el creador o moderadores pueden finalizar esta encuesta.',
            flags: 64,
          });
          return;
        }

        await prisma.poll.update({ where: { id: poll.id }, data: { ended: true } });

        const embed = buildPollEmbed(poll, true);
        await interaction.reply({ embeds: [embed] });

        try {
          const channel = interaction.guild!.channels.cache.get(poll.channelId);
          if (channel && channel.isTextBased() && poll.messageId) {
            const msg = await channel.messages.fetch(poll.messageId);
            await msg.edit({ embeds: [embed], components: [] });
          }
        } catch { /* message may be deleted */ }

        break;
      }
    }
  },
};
