/**
 * /snipe command — View recently deleted messages in a channel.
 * Uses an in-memory cache populated by the messageDelete event.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { moduleColor } from '../../utils';
import { getDeletedMessage, deletedMessagesCache } from '../../modules/utility/snipeCache';

export default {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('View the most recently deleted message in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('index')
        .setDescription('Which deleted message to view (1 = most recent, up to 10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to snipe (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const index = (interaction.options.getInteger('index') ?? 1) - 1; // 0-based
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    const sniped = getDeletedMessage(channel.id, index);

    if (!sniped) {
      await interaction.reply({
        content: 'Nothing to snipe — no recently deleted messages in this channel.',
        ephemeral: true,
      });
      return;
    }

    const total = deletedMessagesCache.get(channel.id)?.length ?? 0;

    const embed = new EmbedBuilder()
      .setColor(moduleColor('utility'))
      .setAuthor({
        name: sniped.authorTag,
        iconURL: sniped.authorAvatar ?? undefined,
      })
      .setDescription(sniped.content || '*No text content*')
      .setFooter({ text: `${index + 1}/${total} • Deleted` })
      .setTimestamp(sniped.deletedAt);

    if (sniped.attachmentUrl) {
      embed.setImage(sniped.attachmentUrl);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
