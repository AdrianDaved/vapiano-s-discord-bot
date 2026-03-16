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
    .setName('programar')
    .setDescription('Gestionar mensajes programados')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('agregar')
        .setDescription('Agregar un mensaje programado')
        .addStringOption((opt) => opt.setName('cron').setDescription('Expresion cron (ej. "0 9 * * *" para diario a las 9am)').setRequired(true))
        .addStringOption((opt) => opt.setName('mensaje').setDescription('Mensaje a enviar').setRequired(true))
        .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde enviar').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar todos los mensajes programados')
    )
    .addSubcommand((sub) =>
      sub
        .setName('eliminar')
        .setDescription('Eliminar un mensaje programado')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del mensaje programado').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('alternar')
        .setDescription('Activar o desactivar un mensaje programado')
        .addStringOption((opt) => opt.setName('id').setDescription('ID del mensaje programado').setRequired(true))
    ),
  module: 'automation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'agregar': {
        const cronExpr = interaction.options.getString('cron', true);
        const message = interaction.options.getString('mensaje', true);
        const channel = interaction.options.getChannel('canal', true);

        if (!cron.validate(cronExpr)) {
          await interaction.reply({
            content: 'Expresion cron invalida. Ejemplos:\n`0 9 * * *` — todos los dias a las 9:00 AM\n`0 */6 * * *` — cada 6 horas\n`0 0 * * 1` — cada lunes a medianoche',
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
          .setTitle('Mensaje Programado Creado')
          .addFields(
            { name: 'ID', value: `\`${scheduled.id.slice(0, 8)}\``, inline: true },
            { name: 'Canal', value: `<#${channel.id}>`, inline: true },
            { name: 'Cron', value: `\`${cronExpr}\``, inline: true },
            { name: 'Mensaje', value: message.slice(0, 1024) }
          )
          .setFooter({ text: 'La tarea se ejecutara dentro de 5 minutos' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'lista': {
        const scheduled = await prisma.scheduledMessage.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
        });

        if (scheduled.length === 0) {
          await interaction.reply({ content: 'No hay mensajes programados.', ephemeral: true });
          return;
        }

        const lines = scheduled.map(
          (s, i) =>
            `**${i + 1}.** \`${s.id.slice(0, 8)}\` ${s.enabled ? '✅' : '❌'}\n   Canal: <#${s.channelId}> | Cron: \`${s.cron}\`\n   Mensaje: ${s.message.slice(0, 60)}${s.message.length > 60 ? '...' : ''}${s.lastRun ? `\n   Ultima ejecucion: <t:${Math.floor(s.lastRun.getTime() / 1000)}:R>` : ''}`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('automation'))
          .setTitle('Mensajes Programados')
          .setDescription(lines.join('\n\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'eliminar': {
        const id = interaction.options.getString('id', true);
        const msg = await prisma.scheduledMessage.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!msg) {
          await interaction.reply({ content: 'Mensaje programado no encontrado.', ephemeral: true });
          return;
        }

        await prisma.scheduledMessage.delete({ where: { id: msg.id } });
        await interaction.reply({ content: `Mensaje programado \`${msg.id.slice(0, 8)}\` eliminado.`, ephemeral: true });
        break;
      }

      case 'alternar': {
        const id = interaction.options.getString('id', true);
        const msg = await prisma.scheduledMessage.findFirst({
          where: { id: { startsWith: id }, guildId },
        });

        if (!msg) {
          await interaction.reply({ content: 'Mensaje programado no encontrado.', ephemeral: true });
          return;
        }

        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { enabled: !msg.enabled },
        });

        await interaction.reply({
          content: `El mensaje programado \`${msg.id.slice(0, 8)}\` ahora esta **${!msg.enabled ? 'activado' : 'desactivado'}**.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
