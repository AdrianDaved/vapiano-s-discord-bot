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

const IMAGE_COUNT = 10;
const IMAGE_OPTIONS = Array.from({ length: IMAGE_COUNT }, (_, i) => `imagen${i + 1}`);

export default {
  data: (() => {
    const builder = new SlashCommandBuilder()
      .setName('hablar')
      .setDescription('Hacer que el bot envíe un mensaje en un canal')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption((opt) =>
        opt.setName('mensaje').setDescription('El mensaje que dirá el bot').setRequired(false)
      );

    for (let i = 1; i <= IMAGE_COUNT; i++) {
      builder.addAttachmentOption((opt) =>
        opt.setName(`imagen${i}`).setDescription(`Imagen ${i} (opcional)`).setRequired(false)
      );
    }

    builder.addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal donde enviar el mensaje (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    );

    builder.addStringOption((opt) =>
      opt
        .setName('id_canal')
        .setDescription('ID del canal donde enviar el mensaje (tiene prioridad sobre "canal")')
        .setRequired(false)
    );

    return builder;
  })(),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('mensaje');
    const files = IMAGE_OPTIONS
      .map((name) => interaction.options.getAttachment(name))
      .filter(Boolean)
      .map((a) => a!.url);

    const channelId = interaction.options.getString('id_canal');
    let channel: GuildTextBasedChannel;

    if (channelId) {
      const resolved = await interaction.guild?.channels.fetch(channelId).catch(() => null);
      if (!resolved || !('send' in resolved)) {
        await interaction.reply({ content: `No encontré un canal de texto con la ID \`${channelId}\`.`, flags: 64 });
        return;
      }
      channel = resolved as GuildTextBasedChannel;
    } else {
      channel = (interaction.options.getChannel('canal') || interaction.channel) as GuildTextBasedChannel;
    }

    if (!message && files.length === 0) {
      await interaction.reply({ content: 'Debes proporcionar un mensaje, al menos una imagen, o ambos.', flags: 64 });
      return;
    }

    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Canal inválido.', flags: 64 });
      return;
    }

    await channel.send({
      content: message || undefined,
      files,
    });

    await interaction.reply({
      content: `Mensaje enviado a <#${channel.id}>.`,
      flags: 64,
    });
  },
};
