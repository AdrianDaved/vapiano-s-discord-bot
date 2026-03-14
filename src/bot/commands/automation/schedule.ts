import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';
import * as cron from 'node-cron';

export default {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Manage scheduled messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a scheduled message')
        .addStringOption((opt) => opt.setName('cron').setDescription('Cron expression (e.g. "0 9 * * *" for daily at 9am)').setRequired(true))
        .addStringOption((opt) => opt.setName('message').setDescription('Message to send').setRequired(true))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to send in').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all scheduled messages')
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a scheduled message')
        .addStringOption((opt) => opt.setName('id').setDescription('Scheduled message ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable a scheduled message')
        .addStringOption((opt) => opt.setName('id').setDescription('Scheduled message ID').setRequired(true))
    ),
  module: 'automation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'add': {
        const cronExpr = interaction.options.getString('cron', true);
        const message = interaction.options.getString('message', true);
        const channel = interaction.options.getChannel('channel', true);

        if (!cron.validate(cronExpr)) {
          await interaction.reply({
            content: 'Invalid cron expression. Examples:\n`0 9 * * *` — every day at 9:00 AM\n`0 */6 * * *` — every 6 hours\n`0 0 * * 1` — every Monday at midnight',
            ephemeral: true,
          });
          return;
        }

        const scheduled = await prisma.scheduledMessage.create({
          data: {
            guildId,
            channelId: channel.id,
            message,
            cron: cronExpr,
            enabled: true,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Scheduled Message Created')
          .addFields(
            { name: 'ID', value: `\`${scheduled.id.slice(0, 8)}\``, inline: true },
            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
            { name: 'Cron', value: `\`${cronExpr}\``, inline: true },
            { name: 'Message', value: message.slice(0, 1024) }
          )
          .setFooter({ text: 'The job will be picked up within 5 minutes' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'list': {
        const scheduled = await prisma.scheduledMessage.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        });

        if (scheduled.length === 0) {
          await interaction.reply({ content: 'No scheduled messages.', ephemeral: true });
          return;
        }

        const lines = scheduled.map(
          (s, i) =>
            `**${i + 1}.** \`${s.id.slice(0, 8)}\` ${s.enabled ? '✅' : '❌'}\n   Channel: <#${s.channelId}> | Cron: \`${s.cron}\`\n   Message: ${s.message.slice(0, 60)}${s.message.length > 60 ? '...' : ''}${s.lastRun ? `\n   Last run: <t:${Math.floor(s.lastRun.getTime() / 1000)}:R>` : ''}`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Scheduled Messages')
          .setDescription(lines.join('\n\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'remove': {
        const id = interaction.options.getString('id', true);
        const msg = await prisma.scheduledMessage.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!msg) {
          await interaction.reply({ content: 'Scheduled message not found.', ephemeral: true });
          return;
        }

        await prisma.scheduledMessage.delete({ where: { id: msg.id } });
        await interaction.reply({ content: `Scheduled message \`${msg.id.slice(0, 8)}\` deleted.`, ephemeral: true });
        break;
      }

      case 'toggle': {
        const id = interaction.options.getString('id', true);
        const msg = await prisma.scheduledMessage.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!msg) {
          await interaction.reply({ content: 'Scheduled message not found.', ephemeral: true });
          return;
        }

        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { enabled: !msg.enabled },
        });

        await interaction.reply({
          content: `Scheduled message \`${msg.id.slice(0, 8)}\` is now **${!msg.enabled ? 'enabled' : 'disabled'}**.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
