/**
 * /modolento command — Establecer modo lento en un canal.
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
    .setName('modolento')
    .setDescription('Establecer o quitar el modo lento de un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName('duracion')
        .setDescription('Duración del modo lento (ej. 5s, 1m, 1h) o "off" para desactivar')
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction: ChatInputCommandInteraction) {
    const durationStr = interaction.options.getString('duracion', true);
    const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

    if (!channel || !('setRateLimitPerUser' in channel)) {
      await interaction.reply({ content: 'Canal de texto inválido.', ephemeral: true });
      return;
    }

    let seconds = 0;
    if (durationStr.toLowerCase() === 'off' || durationStr === '0') {
      seconds = 0;
    } else {
      const parsed = parseDuration(durationStr);
      if (!parsed) {
        await interaction.reply({ content: 'Duración inválida. Usa formatos como `5s`, `1m`, `1h`, o `off`.', ephemeral: true });
        return;
      }
      seconds = parsed;
    }

    // Modo lento máximo de Discord es 6 horas (21600 segundos)
    if (seconds > 21600) {
      await interaction.reply({ content: 'El modo lento máximo es de 6 horas (21600 segundos).', ephemeral: true });
      return;
    }

    await channel.setRateLimitPerUser(seconds, `Establecido por ${interaction.user.username}`);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('moderation'))
      .setDescription(
        seconds === 0
          ? `Modo lento desactivado en <#${channel.id}>.`
          : `Modo lento establecido a **${seconds}s** en <#${channel.id}>.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
