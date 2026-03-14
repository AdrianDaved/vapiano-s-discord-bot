import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, getGuildConfig } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggestion system commands')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Submit a new suggestion')
        .addStringOption((opt) => opt.setName('content').setDescription('Your suggestion').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('approve')
        .setDescription('Approve a suggestion (mod only)')
        .addStringOption((opt) => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption((opt) => opt.setName('note').setDescription('Staff note').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('deny')
        .setDescription('Deny a suggestion (mod only)')
        .addStringOption((opt) => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption((opt) => opt.setName('note').setDescription('Reason for denial').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('implement')
        .setDescription('Mark a suggestion as implemented (mod only)')
        .addStringOption((opt) => opt.setName('id').setDescription('Suggestion ID').setRequired(true))
        .addStringOption((opt) => opt.setName('note').setDescription('Implementation notes').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List recent suggestions')
    ),
  module: 'suggestions',
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'create': {
        const content = interaction.options.getString('content', true);
        const config = await getGuildConfig(guildId);

        const channelId = config.suggestionsChannelId || interaction.channelId;
        const channel = interaction.guild!.channels.cache.get(channelId) as TextChannel;

        if (!channel) {
          await interaction.reply({ content: 'Suggestions channel not configured. Ask an admin to set it with `/config`.', ephemeral: true });
          return;
        }

        // Create the suggestion in DB first to get the ID
        const suggestion = await prisma.suggestion.create({
          data: {
            guildId,
            channelId,
            userId: interaction.user.id,
            content,
          },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('suggestions'))
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setTitle('New Suggestion')
          .setDescription(content)
          .addFields(
            { name: 'Status', value: '⏳ Pending', inline: true },
            { name: 'Votes', value: '👍 0 | 👎 0', inline: true },
          )
          .setFooter({ text: `ID: ${suggestion.id.slice(0, 8)}` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`suggest_up_${suggestion.id}`)
            .setLabel('👍 Upvote')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`suggest_down_${suggestion.id}`)
            .setLabel('👎 Downvote')
            .setStyle(ButtonStyle.Danger),
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        await prisma.suggestion.update({
          where: { id: suggestion.id },
          data: { messageId: msg.id },
        });

        if (channelId !== interaction.channelId) {
          await interaction.reply({ content: `Your suggestion has been submitted in ${channel}!`, ephemeral: true });
        } else {
          await interaction.reply({ content: 'Suggestion submitted!', ephemeral: true });
        }
        break;
      }

      case 'approve':
      case 'deny':
      case 'implement': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'You need the **Manage Server** permission.', ephemeral: true });
          return;
        }

        const id = interaction.options.getString('id', true);
        const note = interaction.options.getString('note');

        // Find suggestion by partial ID match
        const suggestion = await prisma.suggestion.findFirst({
          where: {
            guildId,
            id: { startsWith: id },
          },
        });

        if (!suggestion) {
          await interaction.reply({ content: 'Suggestion not found.', ephemeral: true });
          return;
        }

        const statusMap: Record<string, string> = {
          approve: 'approved',
          deny: 'denied',
          implement: 'implemented',
        };

        const statusEmojiMap: Record<string, string> = {
          approved: '✅ Approved',
          denied: '❌ Denied',
          implemented: '🚀 Implemented',
        };

        const colorMap: Record<string, number> = {
          approved: 0x57f287,
          denied: 0xed4245,
          implemented: 0x5865f2,
        };

        const newStatus = statusMap[sub];

        await prisma.suggestion.update({
          where: { id: suggestion.id },
          data: {
            status: newStatus,
            staffNote: note || undefined,
            reviewedBy: interaction.user.id,
          },
        });

        // Update the original message
        try {
          const channel = interaction.guild!.channels.cache.get(suggestion.channelId) as TextChannel;
          if (channel && suggestion.messageId) {
            const msg = await channel.messages.fetch(suggestion.messageId);
            const embed = EmbedBuilder.from(msg.embeds[0])
              .setColor(colorMap[newStatus])
              .setFields(
                { name: 'Status', value: statusEmojiMap[newStatus], inline: true },
                { name: 'Votes', value: `👍 ${suggestion.upvotes.length} | 👎 ${suggestion.downvotes.length}`, inline: true },
                ...(note ? [{ name: 'Staff Note', value: note }] : []),
              );

            await msg.edit({ embeds: [embed] });
          }
        } catch { /* message may not exist */ }

        await interaction.reply({
          content: `Suggestion \`${suggestion.id.slice(0, 8)}\` has been **${newStatus}**.`,
          ephemeral: true,
        });
        break;
      }

      case 'list': {
        const suggestions = await prisma.suggestion.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (suggestions.length === 0) {
          await interaction.reply({ content: 'No suggestions yet.', ephemeral: true });
          return;
        }

        const statusEmoji: Record<string, string> = {
          pending: '⏳',
          approved: '✅',
          denied: '❌',
          implemented: '🚀',
        };

        const lines = suggestions.map((s) => {
          const emoji = statusEmoji[s.status] || '❓';
          const votes = `👍${s.upvotes.length} 👎${s.downvotes.length}`;
          return `${emoji} \`${s.id.slice(0, 8)}\` ${s.content.slice(0, 60)}${s.content.length > 60 ? '...' : ''} (${votes})`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('suggestions'))
          .setTitle('Recent Suggestions')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};
