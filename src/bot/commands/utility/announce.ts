/**
 * /announce command — Send formatted announcements to a channel.
 * Supports optional pings, embed customization, and scheduled publishing.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  roleMention,
  GuildTextBasedChannel,
  NewsChannel,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send a formatted announcement to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Announcement text (supports Discord markdown)').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Target channel (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Embed title').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('color').setDescription('Embed color hex (e.g. #5865F2)').setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('ping').setDescription('Role to mention with the announcement').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('everyone').setDescription('Ping @everyone').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('image').setDescription('Image URL to attach to the embed').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('publish').setDescription('Auto-publish if sent to an announcement channel').setRequired(false)
    ),
  module: 'utility',
  cooldown: 10,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('message', true);
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as GuildTextBasedChannel;
    const title = interaction.options.getString('title');
    const color = interaction.options.getString('color');
    const pingRole = interaction.options.getRole('ping');
    const pingEveryone = interaction.options.getBoolean('everyone') ?? false;
    const image = interaction.options.getString('image');
    const publish = interaction.options.getBoolean('publish') ?? false;

    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Invalid channel.', ephemeral: true });
      return;
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setDescription(message)
      .setColor(parseColor(color) || moduleColor('utility'))
      .setTimestamp()
      .setFooter({ text: `Announced by ${interaction.user.username}` });

    if (title) embed.setTitle(title);
    if (image) embed.setImage(image);

    // Build content string with pings
    const contentParts: string[] = [];
    if (pingEveryone) contentParts.push('@everyone');
    if (pingRole) contentParts.push(roleMention(pingRole.id));
    const content = contentParts.length > 0 ? contentParts.join(' ') : undefined;

    const sent = await channel.send({
      content,
      embeds: [embed],
      allowedMentions: {
        parse: pingEveryone ? ['everyone'] : [],
        roles: pingRole ? [pingRole.id] : [],
      },
    });

    // Auto-publish in announcement channels
    const isNewsChannel = (channel as any).type === ChannelType.GuildAnnouncement;
    if (publish && isNewsChannel) {
      try {
        await (sent as any).crosspost();
      } catch {
        // Silently fail if publish fails (rate limit, permissions, etc.)
      }
    }

    await interaction.reply({
      content: `Announcement sent to <#${channel.id}>.${publish && isNewsChannel ? ' (Published)' : ''}`,
      ephemeral: true,
    });
  },
};

function parseColor(hex: string | null): number | null {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? null : parsed;
}
