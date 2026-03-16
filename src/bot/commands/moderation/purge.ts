/**
 * /purgar command — Eliminación avanzada de mensajes con filtros.
 * Soporta filtrado por usuario, bots, contenido, embeds, archivos adjuntos y mensajes fijados.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
  Message,
  Collection,
} from 'discord.js';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('purgar')
    .setDescription('Eliminar mensajes masivamente con filtros opcionales')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('cantidad')
        .setDescription('Número de mensajes a eliminar (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Solo eliminar mensajes de este usuario').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('contiene').setDescription('Solo eliminar mensajes que contengan este texto').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('bots').setDescription('Solo eliminar mensajes de bots').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('embeds').setDescription('Solo eliminar mensajes con embeds').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('adjuntos').setDescription('Solo eliminar mensajes con archivos adjuntos').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('omitir_fijados').setDescription('Omitir mensajes fijados (por defecto: sí)').setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('canal')
        .setDescription('Canal a purgar (por defecto el actual)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const targetUser = interaction.options.getUser('usuario');
    const contains = interaction.options.getString('contiene')?.toLowerCase();
    const botsOnly = interaction.options.getBoolean('bots') ?? false;
    const embedsOnly = interaction.options.getBoolean('embeds') ?? false;
    const attachmentsOnly = interaction.options.getBoolean('adjuntos') ?? false;
    const skipPinned = interaction.options.getBoolean('omitir_fijados') ?? true;
    const channel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

    if (!channel || !('bulkDelete' in channel)) {
      await interaction.reply({ content: 'Canal de texto inválido.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Obtener más de lo necesario para compensar los filtros
    const fetchAmount = Math.min(amount * 3, 100);
    let fetched: Collection<string, Message>;
    try {
      fetched = await channel.messages.fetch({ limit: fetchAmount });
    } catch {
      await interaction.editReply({ content: 'Error al obtener los mensajes.' });
      return;
    }

    // Aplicar filtros
    let filtered = [...fetched.values()];

    if (skipPinned) {
      filtered = filtered.filter((m) => !m.pinned);
    }
    if (targetUser) {
      filtered = filtered.filter((m) => m.author.id === targetUser.id);
    }
    if (contains) {
      filtered = filtered.filter((m) => m.content.toLowerCase().includes(contains));
    }
    if (botsOnly) {
      filtered = filtered.filter((m) => m.author.bot);
    }
    if (embedsOnly) {
      filtered = filtered.filter((m) => m.embeds.length > 0);
    }
    if (attachmentsOnly) {
      filtered = filtered.filter((m) => m.attachments.size > 0);
    }

    // Discord solo puede eliminar masivamente mensajes de menos de 14 días
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((m) => m.createdTimestamp > twoWeeksAgo);

    // Limitar a la cantidad solicitada
    const toDelete = filtered.slice(0, amount);

    if (toDelete.length === 0) {
      await interaction.editReply({ content: 'No se encontraron mensajes que coincidan con los filtros.' });
      return;
    }

    try {
      const deleted = await channel.bulkDelete(toDelete, true);

      // Construir resumen de filtros usados
      const filterParts: string[] = [];
      if (targetUser) filterParts.push(`de ${targetUser.username}`);
      if (contains) filterParts.push(`que contengan "${contains}"`);
      if (botsOnly) filterParts.push('solo bots');
      if (embedsOnly) filterParts.push('con embeds');
      if (attachmentsOnly) filterParts.push('con adjuntos');
      if (skipPinned) filterParts.push('omitiendo fijados');

      const filterStr = filterParts.length > 0 ? `\nFiltros: ${filterParts.join(', ')}` : '';

      const embed = new EmbedBuilder()
        .setColor(moduleColor('moderation'))
        .setDescription(`Se eliminaron **${deleted.size}** mensajes en <#${channel.id}>.${filterStr}`)
        .setFooter({ text: `Purgado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `Error al eliminar mensajes: ${err}` });
    }
  },
};
