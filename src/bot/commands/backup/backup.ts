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
    .setName('respaldo')
    .setDescription('Gestion de respaldos del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('crear')
        .setDescription('Crear un respaldo de este servidor')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre del respaldo').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar todos los respaldos de este servidor')
    )
    .addSubcommand((sub) =>
      sub
        .setName('restaurar')
        .setDescription('Restaurar un respaldo (ADVERTENCIA: destructivo)')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del respaldo').setRequired(true))
        .addBooleanOption((opt) =>
          opt.setName('limpiar').setDescription('Limpiar canales/roles existentes antes de restaurar').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('eliminar')
        .setDescription('Eliminar un respaldo')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del respaldo').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Ver detalles de un respaldo')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del respaldo').setRequired(true))
    ),
  module: 'backup',
  cooldown: 10,
  permissions: [PermissionFlagsBits.Administrator],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'crear': {
        const name = interaction.options.getString('nombre', true);
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
            .setTitle('Respaldo Creado')
            .addFields(
              { name: 'Nombre', value: name, inline: true },
              { name: 'ID', value: `\`${backup.id}\``, inline: true },
              { name: 'Tamano', value: `${(backup.size / 1024).toFixed(1)} KB`, inline: true },
              { name: 'Roles', value: `${(data.roles || []).length}`, inline: true },
              { name: 'Channels', value: `${(data.textChannels || []).length + (data.voiceChannels || []).length}`, inline: true },
              { name: 'Categorias', value: `${(data.categories || []).length}`, inline: true }
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          await interaction.editReply({ content: `Error al crear respaldo: ${err}` });
        }
        break;
      }

      case 'lista': {
        const backups = await prisma.backup.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        if (backups.length === 0) {
          await interaction.reply({ content: 'No se encontraron respaldos para este servidor.', ephemeral: true });
          return;
        }

        const lines = backups.map(
          (b, i) =>
            `**${i + 1}.** \`${b.id.slice(0, 8)}\` — **${b.name}** (${(b.size / 1024).toFixed(1)} KB) — <t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('backup'))
          .setTitle('Respaldos del Servidor')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${backups.length} respaldo(s) | Usa /respaldo info <id> para detalles` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'restaurar': {
        const id = interaction.options.getString('id', true);
        const clearExisting = interaction.options.getBoolean('limpiar') ?? false;

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Respaldo no encontrado.', ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const result = await restoreBackupData(interaction.guild!, backup.data as any, {
          clearExisting,
        });

        const detailsStr = result.details.slice(0, 20).join('\n') || 'Sin detalles';

        const embed = new EmbedBuilder()
          .setColor(result.success ? moduleColor('backup') : 0xed4245)
          .setTitle(result.success ? 'Respaldo Restaurado' : 'Error al Restaurar')
          .setDescription(`**Respaldo:** ${backup.name}\n\n${detailsStr}${result.details.length > 20 ? `\n... y ${result.details.length - 20} mas` : ''}`)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'eliminar': {
        const id = interaction.options.getString('id', true);

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Respaldo no encontrado.', ephemeral: true });
          return;
        }

        await prisma.backup.delete({ where: { id: backup.id } });
        await interaction.reply({ content: `Respaldo **${backup.name}** eliminado.`, ephemeral: true });
        break;
      }

      case 'info': {
        const id = interaction.options.getString('id', true);

        const backup = await prisma.backup.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!backup) {
          await interaction.reply({ content: 'Respaldo no encontrado.', ephemeral: true });
          return;
        }

        const data = backup.data as any;

        const embed = new EmbedBuilder()
          .setColor(moduleColor('backup'))
          .setTitle(`Respaldo: ${backup.name}`)
          .addFields(
            { name: 'ID', value: `\`${backup.id}\``, inline: true },
            { name: 'Creado por', value: `<@${backup.creatorId}>`, inline: true },
            { name: 'Creado', value: `<t:${Math.floor(backup.createdAt.getTime() / 1000)}:F>`, inline: true },
            { name: 'Tamano', value: `${(backup.size / 1024).toFixed(1)} KB`, inline: true },
            { name: 'Nombre del servidor', value: data.name || 'N/A', inline: true },
            { name: 'Roles', value: `${(data.roles || []).length}`, inline: true },
            { name: 'Categorias', value: `${(data.categories || []).length}`, inline: true },
            { name: 'Canales de texto', value: `${(data.textChannels || []).length}`, inline: true },
            { name: 'Canales de voz', value: `${(data.voiceChannels || []).length}`, inline: true }
          )
          .setFooter({ text: 'Usa /respaldo restaurar <id> para restaurar este respaldo' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
