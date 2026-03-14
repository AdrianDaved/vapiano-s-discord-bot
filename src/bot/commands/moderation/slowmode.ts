/**
 * /slowmode command — Set channel slowmode.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { moduleColor, parseDuration } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set or remove slowmode for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Slowmode duration (e.g. 5s, 1m, 1h) or "off" to disable')
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction: ChatInputCommandInteraction) {
    const durationStr = interaction.options.getString('duration', true);
    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    if (!channel || !('setRateLimitPerUser' in channel)) {
      await interaction.reply({ content: 'Invalid text channel.', ephemeral: true });
      return;
    }

    let seconds = 0;
    if (durationStr.toLowerCase() === 'off' || durationStr === '0') {
      seconds = 0;
    } else {
      const parsed = parseDuration(durationStr);
      if (!parsed) {
        await interaction.reply({ content: 'Invalid duration. Use formats like `5s`, `1m`, `1h`, or `off`.', ephemeral: true });
        return;
      }
      seconds = parsed;
    }

    // Discord max slowmode is 6 hours (21600 seconds)
    if (seconds > 21600) {
      await interaction.reply({ content: 'Maximum slowmode is 6 hours (21600 seconds).', ephemeral: true });
      return;
    }

    await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.username}`);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('moderation'))
      .setDescription(
        seconds === 0
          ? `Slowmode disabled in <#${channel.id}>.`
          : `Slowmode set to **${seconds}s** in <#${channel.id}>.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
