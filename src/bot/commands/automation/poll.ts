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
import { moduleColor, parseDuration } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('encuesta')
    .setDescription('Crear y gestionar encuestas')
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Crear una nueva encuesta')
        .addStringOption((opt) => opt.setName('pregunta').setDescription('Pregunta de la encuesta').setRequired(true))
        .addStringOption((opt) => opt.setName('opciones').setDescription('Opciones separadas por | (ej. Si | No | Tal vez)').setRequired(true))
        .addStringOption((opt) => opt.setName('duracion').setDescription('Duracion (ej. 1h, 1d). Deja vacio para no expirar'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('finalizar')
        .setDescription('Finalizar una encuesta activa')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la encuesta').setRequired(true))
    ),
  module: 'automation',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'crear': {
        const question = interaction.options.getString('pregunta', true);
        const optionsStr = interaction.options.getString('opciones', true);
        const durationStr = interaction.options.getString('duracion');

        const options = optionsStr.split('|').map((o) => o.trim()).filter((o) => o.length > 0);

        if (options.length < 2 || options.length > 10) {
          await interaction.reply({
            content: 'Debes proporcionar entre 2 y 10 opciones, separadas por `|`.',
            ephemeral: true,
          });
          return;
        }

        let endsAt: Date | null = null;
        if (durationStr) {
          const sec = parseDuration(durationStr);
          if (sec) endsAt = new Date(Date.now() + sec * 1000);
        }

        // Create the poll in database first
        const poll = await prisma.poll.create({
          data: {
            guildId,
            channelId: interaction.channelId,
            question,
            options,
            creatorId: interaction.user.id,
            endsAt,
            votes: {},
          },
        });

        // Build the embed
        const description = options
          .map((option, i) => {
            return `**${i + 1}.** ${option}\n${'░'.repeat(10)} 0 votes (0%)`;
          })
          .join('\n\n');

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle(`📊 ${question}`)
          .setDescription(description)
          .setFooter({
            text: `Total votes: 0${endsAt ? ' | Ends' : ''} | Poll ID: ${poll.id.slice(0, 8)}`,
          })
          .setTimestamp(endsAt || undefined);

        // Build vote buttons
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let currentRow = new ActionRowBuilder<ButtonBuilder>();

        for (let i = 0; i < options.length; i++) {
          if (i > 0 && i % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
          }
          currentRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`poll_${poll.id}_${i}`)
              .setLabel(`${i + 1}. ${options[i].slice(0, 70)}`)
              .setStyle(ButtonStyle.Secondary)
          );
        }
        rows.push(currentRow);

        const reply = await interaction.reply({
          embeds: [embed],
          components: rows,
          fetchReply: true,
        });

        // Save the message ID
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
          await interaction.reply({ content: 'Encuesta no encontrada o ya finalizada.', ephemeral: true });
          return;
        }

        // Check permissions
        if (
          poll.creatorId !== interaction.user.id &&
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)
        ) {
          await interaction.reply({
            content: 'Solo el creador de la encuesta o moderadores pueden finalizarla.',
            ephemeral: true,
          });
          return;
        }

        await prisma.poll.update({
          where: { id: poll.id },
          data: { ended: true },
        });

        const votes: Record<string, string[]> = (poll.votes as any) || {};
        const totalVotes = Object.values(votes).reduce((sum, arr) => sum + arr.length, 0);

        const description = poll.options
          .map((option: string, i: number) => {
            const count = (votes[i.toString()] || []).length;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const barFilled = Math.round(percentage / 10);
            const bar = '▓'.repeat(barFilled) + '░'.repeat(10 - barFilled);
            return `**${i + 1}.** ${option}\n${bar} ${count} votes (${percentage}%)`;
          })
          .join('\n\n');

        // Find winner
        let maxVotes = 0;
        let winnerIdx = 0;
        for (let i = 0; i < poll.options.length; i++) {
          const count = (votes[i.toString()] || []).length;
          if (count > maxVotes) {
            maxVotes = count;
            winnerIdx = i;
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(`📊 ${poll.question} (FINALIZADA)`)
          .setDescription(
            `${description}\n\n🏆 **Ganadora: ${poll.options[winnerIdx]}** con ${maxVotes} voto(s)`
          )
          .setFooter({ text: `Votos totales: ${totalVotes} | Encuesta finalizada` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Try to update the original message to remove buttons
        try {
          const channel = interaction.guild!.channels.cache.get(poll.channelId);
          if (channel && channel.isTextBased() && poll.messageId) {
            const msg = await channel.messages.fetch(poll.messageId);
            await msg.edit({ embeds: [embed], components: [] });
          }
        } catch { /* may fail if message deleted */ }

        break;
      }
    }
  },
};
