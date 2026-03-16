/**
 * /fijo command — Gestionar mensajes fijos
 * 
 * Un mensaje fijo se mantiene al final del canal siendo
 * eliminado y reenviado cada vez que se publican nuevos mensajes.
 * 
 * Subcomandos:
 *   /fijo establecer — Establecer o actualizar el mensaje fijo de un canal
 *   /fijo quitar     — Quitar el mensaje fijo de un canal
 *   /fijo lista      — Listar todos los mensajes fijos del servidor
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import prisma from '../../../database/client';
import { addToStickyCache, removeFromStickyCache } from '../../modules/sticky/stickyHandler';
import logger from '../../../shared/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('fijo')
    .setDescription('Gestionar mensajes fijos que se mantienen al final del canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('establecer')
        .setDescription('Establecer un mensaje fijo en este canal')
        .addStringOption((opt) =>
          opt.setName('titulo').setDescription('Título del embed').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('descripcion').setDescription('Descripción / contenido del embed').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Color hex del embed (ej. #5865F2)').setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('canal')
            .setDescription('Canal (por defecto el actual)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('quitar')
        .setDescription('Quitar el mensaje fijo de un canal')
        .addChannelOption((opt) =>
          opt
            .setName('canal')
            .setDescription('Canal (por defecto el actual)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('lista').setDescription('Listar todos los mensajes fijos del servidor')
    ),

  cooldown: 5,
  module: 'sticky',

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (subcommand) {
      case 'establecer':
        return handleSet(interaction, guildId);
      case 'quitar':
        return handleRemove(interaction, guildId);
      case 'lista':
        return handleList(interaction, guildId);
    }
  },
};

// ─── /fijo establecer ─────────────────────────────────────────
async function handleSet(interaction: ChatInputCommandInteraction, guildId: string) {
  const title = interaction.options.getString('titulo', true);
  const description = interaction.options.getString('descripcion', true);
  const color = interaction.options.getString('color') || '#5865F2';
  const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: 'Canal inválido.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Parsear color
  let colorInt = 0x5865F2;
  try {
    colorInt = parseInt(color.replace('#', ''), 16);
  } catch { /* usar por defecto */ }

  // Construir el embed fijo
  const stickyEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(colorInt);

  // Verificar si ya hay un mensaje fijo en este canal
  const existing = await prisma.stickyMessage.findUnique({
    where: { channelId: channel.id },
  });

  // Eliminar mensaje fijo anterior si existe
  if (existing?.messageId) {
    try {
      const oldMsg = await channel.messages.fetch(existing.messageId);
      await oldMsg.delete();
    } catch { /* el mensaje puede que ya no exista */ }
  }

  // Enviar el nuevo mensaje fijo
  const sent = await channel.send({ embeds: [stickyEmbed] });

  // Upsert en base de datos
  await prisma.stickyMessage.upsert({
    where: { channelId: channel.id },
    update: {
      title,
      description,
      color,
      messageId: sent.id,
      enabled: true,
      createdBy: interaction.user.id,
    },
    create: {
      guildId,
      channelId: channel.id,
      messageId: sent.id,
      title,
      description,
      color,
      enabled: true,
      createdBy: interaction.user.id,
    },
  });

  // Actualizar caché en memoria
  addToStickyCache(channel.id);

  await interaction.editReply({
    content: `Mensaje fijo establecido en <#${channel.id}>. Se mantendrá al final del canal.`,
  });

  logger.info(`[Fijo] ${interaction.user.username} estableció mensaje fijo en #${channel.name} (${channel.id})`);
}

// ─── /fijo quitar ──────────────────────────────────────
async function handleRemove(interaction: ChatInputCommandInteraction, guildId: string) {
  const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

  if (!channel) {
    await interaction.reply({ content: 'Canal inválido.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const existing = await prisma.stickyMessage.findUnique({
    where: { channelId: channel.id },
  });

  if (!existing) {
    await interaction.editReply({ content: `No se encontró mensaje fijo en <#${channel.id}>.` });
    return;
  }

  // Eliminar el mensaje del bot
  if (existing.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.delete();
    } catch { /* ya no existe */ }
  }

  // Eliminar de la base de datos
  await prisma.stickyMessage.delete({ where: { channelId: channel.id } });

  // Actualizar caché en memoria
  removeFromStickyCache(channel.id);

  await interaction.editReply({ content: `Mensaje fijo eliminado de <#${channel.id}>.` });
  logger.info(`[Fijo] ${interaction.user.username} eliminó mensaje fijo de #${channel.name} (${channel.id})`);
}

// ─── /fijo lista ────────────────────────────────────
async function handleList(interaction: ChatInputCommandInteraction, guildId: string) {
  await interaction.deferReply({ ephemeral: true });

  const stickies = await prisma.stickyMessage.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  if (stickies.length === 0) {
    await interaction.editReply({ content: 'No hay mensajes fijos configurados en este servidor.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Mensajes Fijos')
    .setColor(0x5865F2)
    .setDescription(
      stickies
        .map(
          (s, i) =>
            `**${i + 1}.** <#${s.channelId}>\n` +
            `Título: ${s.title || 'Sin título'}\n` +
            `Estado: ${s.enabled ? 'Activo' : 'Desactivado'}`
        )
        .join('\n\n')
    )
    .setFooter({ text: `${stickies.length} mensaje(s) fijo(s)` });

  await interaction.editReply({ embeds: [embed] });
}
