/**
 * /snipe command — Ver mensajes eliminados recientemente en un canal.
 * Usa una caché en memoria poblada por el evento messageDelete.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { moduleColor } from '../../utils';
import { getDeletedMessage, deletedMessagesCache } from '../../modules/utility/snipeCache';

export default {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Ver el último mensaje eliminado en un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('indice')
        .setDescription('Qué mensaje eliminado ver (1 = más reciente, hasta 10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal del que recuperar (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const index = (interaction.options.getInteger('indice') ?? 1) - 1; // 0-based
    const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

    const sniped = getDeletedMessage(channel.id, index);

    if (!sniped) {
      await interaction.reply({
        content: 'Nada que recuperar — no hay mensajes eliminados recientemente en este canal.',
        flags: 64,
      });
      return;
    }

    const total = deletedMessagesCache.get(channel.id)?.length ?? 0;

    const embed = new EmbedBuilder()
      .setColor(moduleColor('utility'))
      .setAuthor({
        name: sniped.authorTag,
        iconURL: sniped.authorAvatar ?? undefined,
      })
      .setDescription(sniped.content || '*Sin contenido de texto*')
      .setFooter({ text: `${index + 1}/${total} • Eliminado` })
      .setTimestamp(sniped.deletedAt);

    if (sniped.attachmentUrl) {
      embed.setImage(sniped.attachmentUrl);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
