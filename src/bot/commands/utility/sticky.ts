/**
 * /sticky command — Manage sticky messages
 * 
 * A sticky message stays at the bottom of a channel by being
 * deleted and re-sent whenever new messages are posted.
 * 
 * Subcommands:
 *   /sticky set    — Set or update the sticky message for a channel
 *   /sticky remove — Remove the sticky message from a channel
 *   /sticky list   — List all sticky messages in this server
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
    .setName('sticky')
    .setDescription('Manage sticky messages that stay at the bottom of a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a sticky message in this channel')
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Embed title').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Embed description / content').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Embed color hex (e.g. #5865F2)').setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel (defaults to current)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove the sticky message from a channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel (defaults to current)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all sticky messages in this server')
    ),

  cooldown: 5,
  module: 'sticky',

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (subcommand) {
      case 'set':
        return handleSet(interaction, guildId);
      case 'remove':
        return handleRemove(interaction, guildId);
      case 'list':
        return handleList(interaction, guildId);
    }
  },
};

// ─── /sticky set ─────────────────────────────────────────
async function handleSet(interaction: ChatInputCommandInteraction, guildId: string) {
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const color = interaction.options.getString('color') || '#5865F2';
  const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: 'Invalid channel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Parse color
  let colorInt = 0x5865F2;
  try {
    colorInt = parseInt(color.replace('#', ''), 16);
  } catch { /* use default */ }

  // Build the sticky embed
  const stickyEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(colorInt);

  // Check if there's already a sticky in this channel
  const existing = await prisma.stickyMessage.findUnique({
    where: { channelId: channel.id },
  });

  // Delete old sticky message if exists
  if (existing?.messageId) {
    try {
      const oldMsg = await channel.messages.fetch(existing.messageId);
      await oldMsg.delete();
    } catch { /* message may already be gone */ }
  }

  // Send the new sticky message
  const sent = await channel.send({ embeds: [stickyEmbed] });

  // Upsert in database
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

  // Update in-memory cache
  addToStickyCache(channel.id);

  await interaction.editReply({
    content: `Sticky message set in <#${channel.id}>. It will stay at the bottom of the channel.`,
  });

  logger.info(`[Sticky] ${interaction.user.username} set sticky in #${channel.name} (${channel.id})`);
}

// ─── /sticky remove ──────────────────────────────────────
async function handleRemove(interaction: ChatInputCommandInteraction, guildId: string) {
  const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

  if (!channel) {
    await interaction.reply({ content: 'Invalid channel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const existing = await prisma.stickyMessage.findUnique({
    where: { channelId: channel.id },
  });

  if (!existing) {
    await interaction.editReply({ content: `No sticky message found in <#${channel.id}>.` });
    return;
  }

  // Delete the bot message
  if (existing.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.delete();
    } catch { /* already gone */ }
  }

  // Remove from database
  await prisma.stickyMessage.delete({ where: { channelId: channel.id } });

  // Update in-memory cache
  removeFromStickyCache(channel.id);

  await interaction.editReply({ content: `Sticky message removed from <#${channel.id}>.` });
  logger.info(`[Sticky] ${interaction.user.username} removed sticky from #${channel.name} (${channel.id})`);
}

// ─── /sticky list ────────────────────────────────────────
async function handleList(interaction: ChatInputCommandInteraction, guildId: string) {
  await interaction.deferReply({ ephemeral: true });

  const stickies = await prisma.stickyMessage.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  if (stickies.length === 0) {
    await interaction.editReply({ content: 'No sticky messages configured in this server.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Sticky Messages')
    .setColor(0x5865F2)
    .setDescription(
      stickies
        .map(
          (s, i) =>
            `**${i + 1}.** <#${s.channelId}>\n` +
            `Title: ${s.title || 'No title'}\n` +
            `Status: ${s.enabled ? 'Active' : 'Disabled'}`
        )
        .join('\n\n')
    )
    .setFooter({ text: `${stickies.length} sticky message(s)` });

  await interaction.editReply({ embeds: [embed] });
}
