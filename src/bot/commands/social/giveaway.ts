import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, parseDuration, formatDuration } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Sistema de sorteos')
    .addSubcommand((sub) =>
      sub
        .setName('iniciar')
        .setDescription('Iniciar un nuevo sorteo')
        .addStringOption((opt) => opt.setName('premio').setDescription('¿Qué vas a sortear?').setRequired(true))
        .addStringOption((opt) => opt.setName('duracion').setDescription('Duración (ej. 1h, 1d, 7d)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('ganadores').setDescription('Número de ganadores (por defecto: 1)').setRequired(false).setMinValue(1).setMaxValue(20))
        .addStringOption((opt) => opt.setName('descripcion').setDescription('Descripción adicional').setRequired(false))
        .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde publicar (por defecto: actual)').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('finalizar')
        .setDescription('Finalizar un sorteo antes de tiempo')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del mensaje del sorteo').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('resortear')
        .setDescription('Elegir nuevos ganadores de un sorteo finalizado')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del mensaje del sorteo').setRequired(true))
        .addIntegerOption((opt) => opt.setName('ganadores').setDescription('Número de nuevos ganadores').setRequired(false).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar sorteos activos')
    ),
  module: 'giveaway',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'iniciar': {
        const prize = interaction.options.getString('premio', true);
        const durationStr = interaction.options.getString('duracion', true);
        const winnersCount = interaction.options.getInteger('ganadores') || 1;
        const description = interaction.options.getString('descripcion');
        const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

        const durationSec = parseDuration(durationStr);
        if (!durationSec) {
          await interaction.reply({ content: 'Duración inválida. Usa formatos como `1h`, `1d`, `7d`.', ephemeral: true });
          return;
        }

        const endsAt = new Date(Date.now() + durationSec * 1000);

        const embed = new EmbedBuilder()
          .setColor(moduleColor('giveaway'))
          .setTitle('🎉 SORTEO 🎉')
          .setDescription(
            `**${prize}**\n\n` +
            (description ? `${description}\n\n` : '') +
            `¡Haz clic en el botón para participar!\n\n` +
            `**Ganadores:** ${winnersCount}\n` +
            `**Termina:** <t:${Math.floor(endsAt.getTime() / 1000)}:R> (<t:${Math.floor(endsAt.getTime() / 1000)}:F>)\n` +
            `**Organizado por:** ${interaction.user}`
          )
          .setFooter({ text: `${winnersCount} ganador(es)` })
          .setTimestamp(endsAt);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Participar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('giveaway_count')
            .setLabel('0 participantes')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        await prisma.giveaway.create({
          data: {
            guildId,
            channelId: channel.id,
            messageId: msg.id,
            hostId: interaction.user.id,
            prize,
            description,
            winners: winnersCount,
            endsAt,
          },
        });

        if (channel.id !== interaction.channelId) {
          await interaction.reply({ content: `¡Sorteo iniciado en ${channel}!`, ephemeral: true });
        } else {
          await interaction.reply({ content: '¡Sorteo iniciado!', ephemeral: true });
        }
        break;
      }

      case 'finalizar': {
        const messageId = interaction.options.getString('id', true);

        const giveaway = await prisma.giveaway.findFirst({
          where: { guildId, messageId, ended: false },
        });

        if (!giveaway) {
          await interaction.reply({ content: 'Sorteo no encontrado o ya finalizado.', ephemeral: true });
          return;
        }

        // Elegir ganadores
        const winners = pickWinners(giveaway.entries, giveaway.winners);

        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { ended: true, winnerIds: winners },
        });

        // Actualizar el mensaje del sorteo
        try {
          const channel = await interaction.guild!.channels.fetch(giveaway.channelId) as TextChannel;
          const msg = await channel.messages.fetch(giveaway.messageId!);

          const winnersText = winners.length > 0
            ? winners.map((w) => `<@${w}>`).join(', ')
            : 'No hay participantes válidos.';

          const embed = EmbedBuilder.from(msg.embeds[0])
            .setTitle('🎉 SORTEO FINALIZADO 🎉')
            .setDescription(
              `**${giveaway.prize}**\n\n` +
              `**Ganador(es):** ${winnersText}\n` +
              `**Organizado por:** <@${giveaway.hostId}>`
            )
            .setColor(0x99aab5);

          await msg.edit({ embeds: [embed], components: [] });

          if (winners.length > 0) {
            await channel.send(`🎉 ¡Felicidades ${winnersText}! Ganaste **${giveaway.prize}**!`);
          }
        } catch { /* el mensaje puede haber sido eliminado */ }

        await interaction.reply({ content: '¡Sorteo finalizado!', ephemeral: true });
        break;
      }

      case 'resortear': {
        const messageId = interaction.options.getString('id', true);
        const newWinnerCount = interaction.options.getInteger('ganadores') || 1;

        const giveaway = await prisma.giveaway.findFirst({
          where: { guildId, messageId, ended: true },
        });

        if (!giveaway) {
          await interaction.reply({ content: 'Sorteo finalizado no encontrado.', ephemeral: true });
          return;
        }

        const winners = pickWinners(giveaway.entries, newWinnerCount);

        await prisma.giveaway.update({
          where: { id: giveaway.id },
          data: { winnerIds: winners },
        });

        if (winners.length === 0) {
          await interaction.reply({ content: 'No hay participantes válidos para resortear.', ephemeral: true });
          return;
        }

        const winnersText = winners.map((w) => `<@${w}>`).join(', ');

        try {
          const channel = await interaction.guild!.channels.fetch(giveaway.channelId) as TextChannel;
          await channel.send(`🎉 ¡Nuevo(s) ganador(es) de **${giveaway.prize}**: ${winnersText}! ¡Felicidades!`);
        } catch { /* ignorar */ }

        await interaction.reply({ content: `¡Resorteado! Nuevo(s) ganador(es): ${winnersText}`, ephemeral: true });
        break;
      }

      case 'lista': {
        const active = await prisma.giveaway.findMany({
          where: { guildId, ended: false },
          orderBy: { endsAt: 'asc' },
        });

        if (active.length === 0) {
          await interaction.reply({ content: 'No hay sorteos activos.', ephemeral: true });
          return;
        }

        const lines = active.map((g) => {
          const endsTimestamp = Math.floor(g.endsAt.getTime() / 1000);
          return `**${g.prize}** — ${g.entries.length} participantes — Termina <t:${endsTimestamp}:R> — [Ir](https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId})`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('giveaway'))
          .setTitle('Sorteos Activos')
          .setDescription(lines.join('\n\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};

/** Elegir ganadores aleatorios de un array de IDs de usuario */
function pickWinners(entries: string[], count: number): string[] {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
