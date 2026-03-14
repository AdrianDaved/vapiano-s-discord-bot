import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a user')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to check (default: yourself)').setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id) as GuildMember | undefined;

    const badges: Record<string, string> = {
      Staff: '<:staff:1>',
      Partner: '🤝',
      Hypesquad: '🏠',
      BugHunterLevel1: '🐛',
      BugHunterLevel2: '🐛',
      HypeSquadOnlineHouse1: '🟣 Bravery',
      HypeSquadOnlineHouse2: '🟢 Brilliance',
      HypeSquadOnlineHouse3: '🟡 Balance',
      PremiumEarlySupporter: '👑 Early Supporter',
      VerifiedDeveloper: '✅ Verified Dev',
      ActiveDeveloper: '💻 Active Dev',
    };

    const userFlags = user.flags?.toArray() || [];
    const badgeList = userFlags.map((f) => badges[f] || f).join(', ') || 'None';

    const createdTimestamp = Math.floor(user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || moduleColor('utility'))
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
        { name: 'Badges', value: badgeList, inline: false },
      );

    if (member) {
      const joinedTimestamp = Math.floor((member.joinedTimestamp || 0) / 1000);
      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guildId)
        .sort((a, b) => b.position - a.position)
        .map((r) => `${r}`)
        .slice(0, 20);

      const boostSince = member.premiumSince
        ? `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:R>`
        : 'Not boosting';

      embed.addFields(
        { name: 'Joined Server', value: `<t:${joinedTimestamp}:F>\n(<t:${joinedTimestamp}:R>)`, inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Boosting', value: boostSince, inline: true },
        { name: `Roles [${roles.length}]`, value: roles.join(', ') || 'None', inline: false },
      );

      if (member.displayColor) {
        embed.addFields({ name: 'Display Color', value: `#${member.displayColor.toString(16).padStart(6, '0')}`, inline: true });
      }
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
