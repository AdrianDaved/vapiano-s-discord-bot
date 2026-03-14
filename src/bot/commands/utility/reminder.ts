/**
 * /reminder command — Personal reminders.
 * Subcommands: set, list, delete
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
    .setName('reminder')
    .setDescription('Manage personal reminders')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a new reminder')
        .addStringOption((opt) =>
          opt.setName('time').setDescription('When to remind (e.g. 10m, 2h, 1d)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('message').setDescription('What to remind you about').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('View your active reminders')
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a reminder')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Reminder ID (use /reminder list to find it)').setRequired(true)
        )
    ),
  module: 'utility',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'set': {
        const timeStr = interaction.options.getString('time', true);
        const message = interaction.options.getString('message', true);

        const seconds = parseDuration(timeStr);
        if (!seconds || seconds < 10) {
          await interaction.reply({
            content: 'Invalid duration. Minimum is 10 seconds. Use formats like `10m`, `2h`, `1d`.',
            ephemeral: true,
          });
          return;
        }

        // Max 30 days
        if (seconds > 30 * 86400) {
          await interaction.reply({
            content: 'Maximum reminder duration is 30 days.',
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
            `Reminder set! I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>.\n` +
            `**Message:** ${message}`
          )
          .setFooter({ text: `ID: ${reminder.id.slice(0, 8)}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'list': {
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
            content: 'You have no active reminders.',
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
          .setTitle('Your Reminders')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `${reminders.length} active reminder(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'delete': {
        const idInput = interaction.options.getString('id', true);

        // Support both short IDs (first 8 chars) and full UUIDs
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
            content: 'Reminder not found. Use `/reminder list` to see your active reminders.',
            ephemeral: true,
          });
          return;
        }

        await prisma.reminder.delete({ where: { id: reminder.id } });

        await interaction.reply({
          content: `Reminder deleted: **${reminder.message.slice(0, 80)}**`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
