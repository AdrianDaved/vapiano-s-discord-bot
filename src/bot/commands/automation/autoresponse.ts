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
    .setName('autoresponse')
    .setDescription('Manage auto-responses')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add an auto-response')
        .addStringOption((opt) => opt.setName('trigger').setDescription('Trigger keyword or phrase').setRequired(true))
        .addStringOption((opt) => opt.setName('response').setDescription('Response message').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('match')
            .setDescription('Match type')
            .addChoices(
              { name: 'Contains', value: 'contains' },
              { name: 'Exact', value: 'exact' },
              { name: 'Starts With', value: 'startsWith' },
              { name: 'Regex', value: 'regex' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all auto-responses')
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an auto-response')
        .addStringOption((opt) => opt.setName('id').setDescription('Auto-response ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable an auto-response')
        .addStringOption((opt) => opt.setName('id').setDescription('Auto-response ID').setRequired(true))
    ),
  module: 'automation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'add': {
        const trigger = interaction.options.getString('trigger', true);
        const response = interaction.options.getString('response', true);
        const matchType = interaction.options.getString('match') || 'contains';

        const ar = await prisma.autoResponse.create({
          data: { guildId, trigger, response, matchType },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Auto-Response Created')
          .addFields(
            { name: 'Trigger', value: `\`${trigger}\``, inline: true },
            { name: 'Match Type', value: matchType, inline: true },
            { name: 'Response', value: response.slice(0, 1024) },
            { name: 'ID', value: `\`${ar.id.slice(0, 8)}\``, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'list': {
        const autoResponses = await prisma.autoResponse.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        });

        if (autoResponses.length === 0) {
          await interaction.reply({ content: 'No auto-responses configured.', ephemeral: true });
          return;
        }

        const lines = autoResponses.map(
          (ar, i) =>
            `**${i + 1}.** \`${ar.id.slice(0, 8)}\` ${ar.enabled ? '✅' : '❌'} — **${ar.matchType}:** \`${ar.trigger}\`\n   → ${ar.response.slice(0, 80)}${ar.response.length > 80 ? '...' : ''}`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Auto-Responses')
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `${autoResponses.length} auto-response(s)` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id', true);
        const ar = await prisma.autoResponse.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!ar) {
          await interaction.reply({ content: 'Auto-response not found.', ephemeral: true });
          return;
        }

        await prisma.autoResponse.delete({ where: { id: ar.id } });
        await interaction.reply({ content: `Auto-response \`${ar.trigger}\` deleted.`, ephemeral: true });
        break;
      }

      case 'toggle': {
        const id = interaction.options.getString('id', true);
        const ar = await prisma.autoResponse.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!ar) {
          await interaction.reply({ content: 'Auto-response not found.', ephemeral: true });
          return;
        }

        await prisma.autoResponse.update({
          where: { id: ar.id },
          data: { enabled: !ar.enabled },
        });

        await interaction.reply({
          content: `Auto-response \`${ar.trigger}\` is now **${!ar.enabled ? 'enabled' : 'disabled'}**.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
