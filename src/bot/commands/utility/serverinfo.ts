import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('servidor')
    .setDescription('Ver información sobre este servidor'),
  cooldown: 10,
  module: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    // Obtener datos completos del servidor si no están en caché
    await guild.fetch();

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
    const forumChannels = channels.filter((c) => c.type === ChannelType.GuildForum).size;
    const stageChannels = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;

    const roles = guild.roles.cache.size - 1; // excluir @everyone
    const emojis = guild.emojis.cache.size;
    const stickers = guild.stickers.cache.size;
    const boosts = guild.premiumSubscriptionCount || 0;

    const verificationLevels: Record<number, string> = {
      0: 'Ninguno',
      1: 'Bajo',
      2: 'Medio',
      3: 'Alto',
      4: 'Muy Alto',
    };

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('utility'))
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
      .setThumbnail(guild.iconURL({ size: 512 }) || null)
      .addFields(
        { name: 'Propietario', value: `${owner.user.username}`, inline: true },
        { name: 'Creado', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        {
          name: `Canales [${channels.size}]`,
          value: [
            `💬 Texto: ${textChannels}`,
            `🔊 Voz: ${voiceChannels}`,
            `📁 Categorías: ${categories}`,
            forumChannels > 0 ? `💬 Foros: ${forumChannels}` : null,
            stageChannels > 0 ? `🎤 Escenario: ${stageChannels}` : null,
          ].filter(Boolean).join('\n'),
          inline: true,
        },
        {
          name: 'Miembros',
          value: `Total: ${guild.memberCount}\nBoosters: ${boosts}`,
          inline: true,
        },
        {
          name: 'Otros',
          value: [
            `Roles: ${roles}`,
            `Emojis: ${emojis}`,
            `Stickers: ${stickers}`,
            `Verificación: ${verificationLevels[guild.verificationLevel] || 'Desconocido'}`,
            `Nivel de Boost: ${guild.premiumTier}`,
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
