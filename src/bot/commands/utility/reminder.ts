/**
 * /recordatorio command — Recordatorios personales.
 * Subcomandos: crear, lista, eliminar
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, parseDuration, formatDuration } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('recordatorio')
    .setDescription('Gestionar recordatorios personales')
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Crear un nuevo recordatorio')
        .addStringOption((opt) =>
          opt.setName('tiempo').setDescription('Cuándo recordar (ej. 10m, 2h, 1d)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('mensaje').setDescription('De qué recordarte').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('lista')
        .setDescription('Ver tus recordatorios activos')
    )
    .addSubcommand((sub) =>
      sub
        .setName('eliminar')
        .setDescription('Eliminar un recordatorio')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('ID del recordatorio (usa /recordatorio lista para encontrarlo)').setRequired(true)
        )
    ),
  module: 'utility',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'crear': {
        const timeStr = interaction.options.getString('tiempo', true);
        const message = interaction.options.getString('mensaje', true);

        const seconds = parseDuration(timeStr);
        if (!seconds || seconds < 10) {
          await interaction.reply({
            content: 'Duración inválida. El mínimo es 10 segundos. Usa formatos como `10m`, `2h`, `1d`.',
            ephemeral: true,
          });
          return;
        }

        // Máximo 30 días
        if (seconds > 30 * 86400) {
          await interaction.reply({
            content: 'La duración máxima del recordatorio es de 30 días.',
            ephemeral: true,
          });
          return;
        }

        const remindAt = new Date(Date.now() + seconds * 1000);

        const reminder = await prisma.reminder.create({
          data: {
            guildId: interaction.guildId!,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            message,
            remindAt,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('utility'))
          .setDescription(
            `¡Recordatorio creado! Te recordaré <t:${Math.floor(remindAt.getTime() / 1000)}:R>.\n` +
            `**Mensaje:** ${message}`
          )
          .setFooter({ text: `ID: ${reminder.id.slice(0, 8)}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'lista': {
        const reminders = await prisma.reminder.findMany({
          where: {
            userId: interaction.user.id,
            guildId: interaction.guildId!,
            fired: false,
            remindAt: { gt: new Date() },
          },
          orderBy: { remindAt: 'asc' },
          take: 10,
        });

        if (reminders.length === 0) {
          await interaction.reply({
            content: 'No tienes recordatorios activos.',
            ephemeral: true,
          });
          return;
        }

        const lines = reminders.map((r, i) => {
          const timestamp = Math.floor(r.remindAt.getTime() / 1000);
          return `**${i + 1}.** ${r.message.slice(0, 80)} — <t:${timestamp}:R>\n\`ID: ${r.id.slice(0, 8)}\``;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('utility'))
          .setTitle('Tus Recordatorios')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `${reminders.length} recordatorio(s) activo(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'eliminar': {
        const idInput = interaction.options.getString('id', true);

        // Soporta tanto IDs cortos (primeros 8 caracteres) como UUIDs completos
        const reminder = await prisma.reminder.findFirst({
          where: {
            userId: interaction.user.id,
            guildId: interaction.guildId!,
            fired: false,
            id: { startsWith: idInput },
          },
        });

        if (!reminder) {
          await interaction.reply({
            content: 'Recordatorio no encontrado. Usa `/recordatorio lista` para ver tus recordatorios activos.',
            ephemeral: true,
          });
          return;
        }

        await prisma.reminder.delete({ where: { id: reminder.id } });

        await interaction.reply({
          content: `Recordatorio eliminado: **${reminder.message.slice(0, 80)}**`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
