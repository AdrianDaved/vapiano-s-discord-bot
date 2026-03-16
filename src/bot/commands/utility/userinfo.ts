import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('usuario')
    .setDescription('Ver información sobre un usuario')
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Usuario a consultar (por defecto: tú mismo)').setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id) as GuildMember | undefined;

    const badges: Record<string, string> = {
      Staff: '<:staff:1>',
      Partner: '🤝',
      Hypesquad: '🏠',
      BugHunterLevel1: '🐛',
      BugHunterLevel2: '🐛',
      HypeSquadOnlineHouse1: '🟣 Valentía',
      HypeSquadOnlineHouse2: '🟢 Brillantez',
      HypeSquadOnlineHouse3: '🟡 Equilibrio',
      PremiumEarlySupporter: '👑 Supporter Temprano',
      VerifiedDeveloper: '✅ Dev Verificado',
      ActiveDeveloper: '💻 Dev Activo',
    };

    const userFlags = user.flags?.toArray() || [];
    const badgeList = userFlags.map((f) => badges[f] || f).join(', ') || 'Ninguna';

    const createdTimestamp = Math.floor(user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || moduleColor('utility'))
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Sí' : 'No', inline: true },
        { name: 'Creado', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
        { name: 'Insignias', value: badgeList, inline: false },
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
        : 'No está boosteando';

      embed.addFields(
        { name: 'Se unió al servidor', value: `<t:${joinedTimestamp}:F>\n(<t:${joinedTimestamp}:R>)`, inline: true },
        { name: 'Apodo', value: member.nickname || 'Ninguno', inline: true },
        { name: 'Boosteando', value: boostSince, inline: true },
        { name: `Roles [${roles.length}]`, value: roles.join(', ') || 'Ninguno', inline: false },
      );

      if (member.displayColor) {
        embed.addFields({ name: 'Color de visualización', value: `#${member.displayColor.toString(16).padStart(6, '0')}`, inline: true });
      }
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
