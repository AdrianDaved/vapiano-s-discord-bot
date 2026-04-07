import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('limpiar')
    .setDescription('Eliminar mensajes de un canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('cantidad')
        .setDescription('Número de mensajes a eliminar (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((opt) =>
      opt
        .setName('usuario')
        .setDescription('Eliminar solo los mensajes de este usuario')
        .setRequired(false)
    ),

  module: 'moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('cantidad', true);
    const targetUser = interaction.options.getUser('usuario');
    const channel = interaction.channel as TextChannel;

    await interaction.deferReply({ flags: 64 });

    // Fetch messages (fetch extra if filtering by user so we can reach the target count)
    const fetchLimit = targetUser ? Math.min(amount * 5, 100) : amount;
    let messages = await channel.messages.fetch({ limit: fetchLimit });

    if (targetUser) {
      messages = messages.filter((m) => m.author.id === targetUser.id);
    }

    // Discord solo permite bulk-delete de mensajes con menos de 14 días
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);

    // Limitar al número pedido
    const toDelete = messages.first(amount);

    if (toDelete.length === 0) {
      await interaction.editReply({ content: 'No hay mensajes eliminables en este canal.' });
      return;
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply({
      content: `✅ Se eliminaron **${deleted.size}** mensaje(s)${targetUser ? ` de **${targetUser.username}**` : ''}.`,
    });
  },
};
