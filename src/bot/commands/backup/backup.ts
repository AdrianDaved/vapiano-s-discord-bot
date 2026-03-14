import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { createBackupData, restoreBackupData } from '../../modules/backup/backupManager';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Server backup management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a backup of this server')
        .addStringOption((opt) => opt.setName('name').setDescription('Backup name').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all backups for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('restore')
        .setDescription('Restore a backup (WARNING: destructive)')
        .addStringOption((opt) => opt.setName('id').setDescription('Backup ID').setRequired(true))
        .addBooleanOption((opt) =>
          opt.setName('clear').setDescription('Clear existing channels/roles before restoring').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a backup')
        .addStringOption((opt) => opt.setName('id').setDescription('Backup ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('View details of a backup')
        .addStringOption((opt) => opt.setName('id').setDescription('Backup ID').setRequired(true))
    ),
  module: 'backup',
  cooldown: 10,
  permissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'create': {
        const name = interaction.options.getString('name', true);
        await interaction.deferReply({ ephemeral: true });

        try {
          const data = await createBackupData(interaction.guild!);
          const jsonStr = JSON.stringify(data);

          const backup = await prisma.backup.create({
            data: {
              guildId,
              creatorId: interaction.user.id,
              name,
              data: data as any,
              size: Buffer.byteLength(jsonStr, 'utf8'),
            },
          });

          const embed = new EmbedBuilder()
            .setColor(moduleColor('backup'))
            .setTitle('Backup Created')
            .addFields(
              { name: 'Name', value: name, inline: true },
              { name: 'ID', value: `\`${backup.id}\``, inline: true },
              { name: 'Size', value: `${(backup.size / 1024).toFixed(1)} KB`, inline: true },
              { name: 'Roles', value: `${(data.roles || []).length}`, inline: true },
              { name: 'Channels', value: `${(data.textChannels || []).length + (data.voiceChannels || []).length}`, inline: true },
              { name: 'Categories', value: `${(data.categories || []).length}`, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          await interaction.editReply({ content: `Failed to create backup: ${err}` });
        }
        break;
      }

      case 'list': {
        const backups = await prisma.backup.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        if (backups.length === 0) {
          await interaction.reply({ content: 'No backups found for this server.', ephemeral: true });
          return;
        }

        const lines = backups.map(
          (b, i) =>
            `**${i + 1}.** \`${b.id.slice(0, 8)}\` — **${b.name}** (${(b.size / 1024).toFixed(1)} KB) — <t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('backup'))
          .setTitle('Server Backups')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${backups.length} backup(s) | Use /backup info <id> for details` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'restore': {
        const id = interaction.options.getString('id', true);
        const clearExisting = interaction.options.getBoolean('clear') ?? false;

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Backup not found.', ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await restoreBackupData(interaction.guild!, backup.data as any, {
          clearExisting,
        });

        const detailsStr = result.details.slice(0, 20).join('\n') || 'No details';

        const embed = new EmbedBuilder()
          .setColor(result.success ? moduleColor('backup') : 0xed4245)
          .setTitle(result.success ? 'Backup Restored' : 'Restore Failed')
          .setDescription(`**Backup:** ${backup.name}\n\n${detailsStr}${result.details.length > 20 ? `\n... and ${result.details.length - 20} more` : ''}`)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'delete': {
        const id = interaction.options.getString('id', true);

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Backup not found.', ephemeral: true });
          return;
        }

        await prisma.backup.delete({ where: { id: backup.id } });
        await interaction.reply({ content: `Backup **${backup.name}** deleted.`, ephemeral: true });
        break;
      }

      case 'info': {
        const id = interaction.options.getString('id', true);

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Backup not found.', ephemeral: true });
          return;
        }

        const data = backup.data as any;

        const embed = new EmbedBuilder()
          .setColor(moduleColor('backup'))
          .setTitle(`Backup: ${backup.name}`)
          .addFields(
            { name: 'ID', value: `\`${backup.id}\``, inline: true },
            { name: 'Created By', value: `<@${backup.creatorId}>`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(backup.createdAt.getTime() / 1000)}:F>`, inline: true },
            { name: 'Size', value: `${(backup.size / 1024).toFixed(1)} KB`, inline: true },
            { name: 'Server Name', value: data.name || 'N/A', inline: true },
            { name: 'Roles', value: `${(data.roles || []).length}`, inline: true },
            { name: 'Categories', value: `${(data.categories || []).length}`, inline: true },
            { name: 'Text Channels', value: `${(data.textChannels || []).length}`, inline: true },
            { name: 'Voice Channels', value: `${(data.voiceChannels || []).length}`, inline: true }
          )
          .setFooter({ text: 'Use /backup restore <id> to restore this backup' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
