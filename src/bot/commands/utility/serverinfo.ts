import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View information about this server'),
  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    // Fetch full guild data if not cached
    await guild.fetch();

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
    const forumChannels = channels.filter((c) => c.type === ChannelType.GuildForum).size;
    const stageChannels = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;

    const roles = guild.roles.cache.size - 1; // exclude @everyone
    const emojis = guild.emojis.cache.size;
    const stickers = guild.stickers.cache.size;
    const boosts = guild.premiumSubscriptionCount || 0;

    const verificationLevels: Record<number, string> = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High',
    };

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('utility'))
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
      .setThumbnail(guild.iconURL({ size: 512 }) || null)
      .addFields(
        { name: 'Owner', value: `${owner.user.username}`, inline: true },
        { name: 'Created', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        {
          name: `Channels [${channels.size}]`,
          value: [
            `💬 Text: ${textChannels}`,
            `🔊 Voice: ${voiceChannels}`,
            `📁 Categories: ${categories}`,
            forumChannels > 0 ? `💬 Forums: ${forumChannels}` : null,
            stageChannels > 0 ? `🎤 Stage: ${stageChannels}` : null,
          ].filter(Boolean).join('\n'),
          inline: true,
        },
        {
          name: 'Members',
          value: `Total: ${guild.memberCount}\nBoosters: ${boosts}`,
          inline: true,
        },
        {
          name: 'Other',
          value: [
            `Roles: ${roles}`,
            `Emojis: ${emojis}`,
            `Stickers: ${stickers}`,
            `Verification: ${verificationLevels[guild.verificationLevel] || 'Unknown'}`,
            `Boost Level: ${guild.premiumTier}`,
          ].join('\n'),
          inline: true,
        },
      )
      .setTimestamp();

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 })!);
    }

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
