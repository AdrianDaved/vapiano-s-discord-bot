/**
 * /purge command — Advanced message deletion with filters.
 * Supports filtering by user, bots, content, embeds, attachments, and pinned messages.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
  Message,
  Collection,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in bulk with optional filters')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Only delete messages from this user').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('contains').setDescription('Only delete messages containing this text').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('bots').setDescription('Only delete bot messages').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('embeds').setDescription('Only delete messages with embeds').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('attachments').setDescription('Only delete messages with attachments').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('skip_pinned').setDescription('Skip pinned messages (default: true)').setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to purge (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains')?.toLowerCase();
    const botsOnly = interaction.options.getBoolean('bots') ?? false;
    const embedsOnly = interaction.options.getBoolean('embeds') ?? false;
    const attachmentsOnly = interaction.options.getBoolean('attachments') ?? false;
    const skipPinned = interaction.options.getBoolean('skip_pinned') ?? true;
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    if (!channel || !('bulkDelete' in channel)) {
      await interaction.reply({ content: 'Invalid text channel.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Fetch more than needed to account for filters
    const fetchAmount = Math.min(amount * 3, 100);
    let fetched: Collection<string, Message>;
    try {
      fetched = await channel.messages.fetch({ limit: fetchAmount });
    } catch {
      await interaction.editReply({ content: 'Failed to fetch messages.' });
      return;
    }

    // Apply filters
    let filtered = [...fetched.values()];

    if (skipPinned) {
      filtered = filtered.filter((m) => !m.pinned);
    }
    if (targetUser) {
      filtered = filtered.filter((m) => m.author.id === targetUser.id);
    }
    if (contains) {
      filtered = filtered.filter((m) => m.content.toLowerCase().includes(contains));
    }
    if (botsOnly) {
      filtered = filtered.filter((m) => m.author.bot);
    }
    if (embedsOnly) {
      filtered = filtered.filter((m) => m.embeds.length > 0);
    }
    if (attachmentsOnly) {
      filtered = filtered.filter((m) => m.attachments.size > 0);
    }

    // Discord can only bulk-delete messages less than 14 days old
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((m) => m.createdTimestamp > twoWeeksAgo);

    // Limit to requested amount
    const toDelete = filtered.slice(0, amount);

    if (toDelete.length === 0) {
      await interaction.editReply({ content: 'No messages matched the given filters.' });
      return;
    }

    try {
      const deleted = await channel.bulkDelete(toDelete, true);

      // Build summary of filters used
      const filterParts: string[] = [];
      if (targetUser) filterParts.push(`from ${targetUser.username}`);
      if (contains) filterParts.push(`containing "${contains}"`);
      if (botsOnly) filterParts.push('bots only');
      if (embedsOnly) filterParts.push('with embeds');
      if (attachmentsOnly) filterParts.push('with attachments');
      if (skipPinned) filterParts.push('skipped pinned');

      const filterStr = filterParts.length > 0 ? `\nFilters: ${filterParts.join(', ')}` : '';

      const embed = new EmbedBuilder()
        .setColor(moduleColor('moderation'))
        .setDescription(`Deleted **${deleted.size}** messages in <#${channel.id}>.${filterStr}`)
        .setFooter({ text: `Purged by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `Failed to delete messages: ${err}` });
    }
  },
};
