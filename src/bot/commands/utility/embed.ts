/**
 * /embed command — Build and send custom embeds.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and send a custom embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Send a custom embed to a channel')
        .addStringOption((opt) => opt.setName('title').setDescription('Embed title').setRequired(true))
        .addStringOption((opt) => opt.setName('description').setDescription('Embed description').setRequired(true))
        .addStringOption((opt) => opt.setName('color').setDescription('Hex color (e.g. #5865F2)').setRequired(false))
        .addStringOption((opt) => opt.setName('footer').setDescription('Footer text').setRequired(false))
        .addStringOption((opt) => opt.setName('image').setDescription('Image URL').setRequired(false))
        .addStringOption((opt) => opt.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target channel (defaults to current)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit an existing embed message sent by the bot')
        .addStringOption((opt) => opt.setName('message_id').setDescription('Message ID to edit').setRequired(true))
        .addStringOption((opt) => opt.setName('title').setDescription('New title').setRequired(false))
        .addStringOption((opt) => opt.setName('description').setDescription('New description').setRequired(false))
        .addStringOption((opt) => opt.setName('color').setDescription('New hex color').setRequired(false))
        .addStringOption((opt) => opt.setName('footer').setDescription('New footer text').setRequired(false))
        .addStringOption((opt) => opt.setName('image').setDescription('New image URL').setRequired(false))
        .addStringOption((opt) => opt.setName('thumbnail').setDescription('New thumbnail URL').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel containing the message')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'send': {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const color = interaction.options.getString('color');
        const footer = interaction.options.getString('footer');
        const image = interaction.options.getString('image');
        const thumbnail = interaction.options.getString('thumbnail');
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(parseColor(color) || 0x5865f2)
          .setTimestamp();

        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `Embed sent to <#${channel.id}>.`, ephemeral: true });
        break;
      }

      case 'edit': {
        const messageId = interaction.options.getString('message_id', true);
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        let msg;
        try {
          msg = await channel.messages.fetch(messageId);
        } catch {
          await interaction.reply({ content: 'Message not found.', ephemeral: true });
          return;
        }

        if (msg.author.id !== interaction.client.user?.id) {
          await interaction.reply({ content: 'I can only edit messages sent by me.', ephemeral: true });
          return;
        }

        if (msg.embeds.length === 0) {
          await interaction.reply({ content: 'That message has no embeds to edit.', ephemeral: true });
          return;
        }

        const embed = EmbedBuilder.from(msg.embeds[0]);

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color');
        const footer = interaction.options.getString('footer');
        const image = interaction.options.getString('image');
        const thumbnail = interaction.options.getString('thumbnail');

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(parseColor(color) || 0x5865f2);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await msg.edit({ embeds: [embed] });
        await interaction.reply({ content: 'Embed updated.', ephemeral: true });
        break;
      }
    }
  },
};

function parseColor(hex: string | null): number | null {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? null : parsed;
}
