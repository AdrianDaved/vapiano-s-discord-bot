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
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('autorespuesta')
    .setDescription('Gestionar autorespuestas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('agregar')
        .setDescription('Agregar una autorespuesta')
        .addStringOption((opt) => opt.setName('disparador').setDescription('Palabra o frase disparadora').setRequired(true))
        .addStringOption((opt) => opt.setName('respuesta').setDescription('Mensaje de respuesta').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('coincidencia')
            .setDescription('Tipo de coincidencia')
            .addChoices(
              { name: 'Contiene', value: 'contains' },
              { name: 'Exacta', value: 'exact' },
              { name: 'Empieza con', value: 'startsWith' },
              { name: 'Regex', value: 'regex' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar todas las autorespuestas')
    )
    .addSubcommand((sub) =>
      sub
        .setName('eliminar')
        .setDescription('Eliminar una autorespuesta')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la autorespuesta').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('alternar')
        .setDescription('Activar o desactivar una autorespuesta')
        .addStringOption((opt) => opt.setName('id').setDescription('ID de la autorespuesta').setRequired(true))
    ),
  module: 'automation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'agregar': {
        const trigger = interaction.options.getString('disparador', true);
        const response = interaction.options.getString('respuesta', true);
        const matchType = interaction.options.getString('coincidencia') || 'contains';

        const ar = await prisma.autoResponse.create({
          data: { guildId, trigger, response, matchType },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Autorespuesta Creada')
          .addFields(
            { name: 'Disparador', value: `\`${trigger}\``, inline: true },
            { name: 'Tipo de coincidencia', value: matchType, inline: true },
            { name: 'Respuesta', value: response.slice(0, 1024) },
            { name: 'ID', value: `\`${ar.id.slice(0, 8)}\``, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        break;
      }

      case 'lista': {
        const autoResponses = await prisma.autoResponse.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        });

        if (autoResponses.length === 0) {
          await interaction.reply({ content: 'No hay autorespuestas configuradas.', flags: 64 });
          return;
        }

        const lines = autoResponses.map(
          (ar, i) =>
            `**${i + 1}.** \`${ar.id.slice(0, 8)}\` ${ar.enabled ? '✅' : '❌'} — **${ar.matchType}:** \`${ar.trigger}\`\n   → ${ar.response.slice(0, 80)}${ar.response.length > 80 ? '...' : ''}`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Autorespuestas')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `${autoResponses.length} autorespuesta(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        break;
      }

      case 'eliminar': {
        const id = interaction.options.getString('id', true);
        const ar = await prisma.autoResponse.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!ar) {
          await interaction.reply({ content: 'Autorespuesta no encontrada.', flags: 64 });
          return;
        }

        await prisma.autoResponse.delete({ where: { id: ar.id } });
        await interaction.reply({ content: `Autorespuesta \`${ar.trigger}\` eliminada.`, flags: 64 });
        break;
      }

      case 'alternar': {
        const id = interaction.options.getString('id', true);
        const ar = await prisma.autoResponse.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!ar) {
          await interaction.reply({ content: 'Autorespuesta no encontrada.', flags: 64 });
          return;
        }

        await prisma.autoResponse.update({
          where: { id: ar.id },
          data: { enabled: !ar.enabled },
        });

        await interaction.reply({
          content: `La autorespuesta \`${ar.trigger}\` ahora esta **${!ar.enabled ? 'activada' : 'desactivada'}**.`,
          flags: 64,
        });
        break;
      }
    }
  },
};
