/**
 * /embed command — Crear y enviar embeds personalizados.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crear y enviar un embed personalizado')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('enviar')
        .setDescription('Enviar un embed personalizado a un canal')
        .addStringOption((opt) => opt.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption((opt) => opt.setName('descripcion').setDescription('Descripción del embed').setRequired(true))
        .addStringOption((opt) => opt.setName('color').setDescription('Color hex (ej. #5865F2)').setRequired(false))
        .addStringOption((opt) => opt.setName('pie').setDescription('Texto del pie de página').setRequired(false))
        .addStringOption((opt) => opt.setName('imagen').setDescription('URL de imagen').setRequired(false))
        .addStringOption((opt) => opt.setName('miniatura').setDescription('URL de miniatura').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('canal')
            .setDescription('Canal destino (por defecto el actual)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('editar')
        .setDescription('Editar un embed existente enviado por el bot')
        .addStringOption((opt) => opt.setName('id_mensaje').setDescription('ID del mensaje a editar').setRequired(true))
        .addStringOption((opt) => opt.setName('titulo').setDescription('Nuevo título').setRequired(false))
        .addStringOption((opt) => opt.setName('descripcion').setDescription('Nueva descripción').setRequired(false))
        .addStringOption((opt) => opt.setName('color').setDescription('Nuevo color hex').setRequired(false))
        .addStringOption((opt) => opt.setName('pie').setDescription('Nuevo texto del pie').setRequired(false))
        .addStringOption((opt) => opt.setName('imagen').setDescription('Nueva URL de imagen').setRequired(false))
        .addStringOption((opt) => opt.setName('miniatura').setDescription('Nueva URL de miniatura').setRequired(false))
        .addChannelOption((opt) =>
          opt
            .setName('canal')
            .setDescription('Canal que contiene el mensaje')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),
  module: 'utility',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'enviar': {
        const title = interaction.options.getString('titulo', true);
        const description = interaction.options.getString('descripcion', true);
        const color = interaction.options.getString('color');
        const footer = interaction.options.getString('pie');
        const image = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('miniatura');
        const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(parseColor(color) || 0x5865f2)
          .setTimestamp();

        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `Embed enviado a <#${channel.id}>.`, ephemeral: true });
        break;
      }

      case 'editar': {
        const messageId = interaction.options.getString('id_mensaje', true);
        const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

        let msg;
        try {
          msg = await channel.messages.fetch(messageId);
        } catch {
          await interaction.reply({ content: 'Mensaje no encontrado.', ephemeral: true });
          return;
        }

        if (msg.author.id !== interaction.client.user?.id) {
          await interaction.reply({ content: 'Solo puedo editar mensajes enviados por mí.', ephemeral: true });
          return;
        }

        if (msg.embeds.length === 0) {
          await interaction.reply({ content: 'Ese mensaje no tiene embeds para editar.', ephemeral: true });
          return;
        }

        const embed = EmbedBuilder.from(msg.embeds[0]);

        const title = interaction.options.getString('titulo');
        const description = interaction.options.getString('descripcion');
        const color = interaction.options.getString('color');
        const footer = interaction.options.getString('pie');
        const image = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('miniatura');

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (color) embed.setColor(parseColor(color) || 0x5865f2);
        if (footer) embed.setFooter({ text: footer });
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await msg.edit({ embeds: [embed] });
        await interaction.reply({ content: 'Embed actualizado.', ephemeral: true });
        break;
      }
    }
  },
};

function parseColor(hex: string | null): number | null {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? null : parsed;
}
