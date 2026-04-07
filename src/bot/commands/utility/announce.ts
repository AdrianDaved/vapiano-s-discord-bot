/**
 * /anunciar command — Enviar anuncios formateados a un canal.
 * Soporta menciones opcionales, personalización de embeds y publicación automática.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  roleMention,
  GuildTextBasedChannel,
  NewsChannel,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('anunciar')
    .setDescription('Enviar un anuncio formateado a un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName('mensaje').setDescription('Texto del anuncio (soporta markdown de Discord)').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal destino (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('titulo').setDescription('Título del embed').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('color').setDescription('Color hex del embed (ej. #5865F2)').setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('mencionar').setDescription('Rol a mencionar con el anuncio').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('everyone').setDescription('Mencionar a @everyone').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('imagen').setDescription('URL de imagen para adjuntar al embed').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('publicar').setDescription('Auto-publicar si se envía a un canal de anuncios').setRequired(false)
    ),
  module: 'utility',
  cooldown: 10,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString('mensaje', true);
    const channel = (interaction.options.getChannel('canal') || interaction.channel) as GuildTextBasedChannel;
    const title = interaction.options.getString('titulo');
    const color = interaction.options.getString('color');
    const pingRole = interaction.options.getRole('mencionar');
    const pingEveryone = interaction.options.getBoolean('everyone') ?? false;
    const image = interaction.options.getString('imagen');
    const publish = interaction.options.getBoolean('publicar') ?? false;

    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Canal inválido.', flags: 64 });
      return;
    }

    // Construir el embed
    const embed = new EmbedBuilder()
      .setDescription(message)
      .setColor(parseColor(color) || moduleColor('utility'))
      .setTimestamp()
      .setFooter({ text: `Anunciado por ${interaction.user.username}` });

    if (title) embed.setTitle(title);
    if (image) embed.setImage(image);

    // Construir string de contenido con menciones
    const contentParts: string[] = [];
    if (pingEveryone) contentParts.push('@everyone');
    if (pingRole) contentParts.push(roleMention(pingRole.id));
    const content = contentParts.length > 0 ? contentParts.join(' ') : undefined;

    const sent = await channel.send({
      content,
      embeds: [embed],
      allowedMentions: {
        parse: pingEveryone ? ['everyone'] : [],
        roles: pingRole ? [pingRole.id] : [],
      },
    });

    // Auto-publicar en canales de anuncios
    const isNewsChannel = (channel as any).type === ChannelType.GuildAnnouncement;
    if (publish && isNewsChannel) {
      try {
        await (sent as any).crosspost();
      } catch {
        // Fallo silencioso si la publicación falla (rate limit, permisos, etc.)
      }
    }

    await interaction.reply({
      content: `Anuncio enviado a <#${channel.id}>.${publish && isNewsChannel ? ' (Publicado)' : ''}`,
      flags: 64,
    });
  },
};

function parseColor(hex: string | null): number | null {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? null : parsed;
}
