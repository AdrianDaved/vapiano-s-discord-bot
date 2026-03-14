/**
 * /speak command — Make the bot say a message in the current (or specified) channel.
 * The bot deletes the interaction reply so it looks like the bot spoke on its own.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  GuildTextBasedChannel,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('speak')
    .setDescription('Make the bot send a message in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName('message').setDescription('The message the bot will say').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to send the message in (defaults to current)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('message', true);
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as GuildTextBasedChannel;

    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Invalid channel.', ephemeral: true });
      return;
    }

    await channel.send(message);

    await interaction.reply({
      content: `Message sent to <#${channel.id}>.`,
      ephemeral: true,
    });
  },
};
