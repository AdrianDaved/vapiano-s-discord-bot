/**
 * /hablar command — Hacer que el bot envíe un mensaje en el canal actual (o uno especificado).
 * El bot elimina la respuesta de interacción para que parezca que habló solo.
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
    .setName('hablar')
    .setDescription('Hacer que el bot envíe un mensaje en un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName('mensaje').setDescription('El mensaje que dirá el bot').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal donde enviar el mensaje (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('mensaje', true);
    const channel = (interaction.options.getChannel('canal') || interaction.channel) as GuildTextBasedChannel;

    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Canal inválido.', ephemeral: true });
      return;
    }

    await channel.send(message);

    await interaction.reply({
      content: `Mensaje enviado a <#${channel.id}>.`,
      ephemeral: true,
    });
  },
};
