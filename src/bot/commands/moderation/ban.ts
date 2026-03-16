import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import prisma from '../../../database/client';

const ANNOUNCE_CHANNEL = '1482938839084306482';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banear a un usuario del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Usuario a banear').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('razon').setDescription('Razón del ban').setRequired(true)
    ),
  module: 'moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('razon', true);
    const guildId = interaction.guildId!;

    const member = interaction.guild!.members.cache.get(user.id);
    if (member && !member.bannable) {
      await interaction.reply({ content: 'No puedo banear a este usuario (jerarquía de roles).', ephemeral: true });
      return;
    }

    // DM al usuario antes de banear
    try {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(`Has sido baneado de ${interaction.guild!.name}`)
            .addFields({ name: 'Razón', value: reason })
            .setTimestamp(),
        ],
      });
    } catch { /* DMs cerrados */ }

    await interaction.guild!.members.ban(user.id, { reason });

    await prisma.modAction.create({
      data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: 'ban', reason },
    });

    // Cartel de ban
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setAuthor({
        name: interaction.guild!.name,
        iconURL: interaction.guild!.iconURL({ size: 64 }) ?? undefined,
      })
      .setTitle('🚨 USUARIO BANEADO')
      .setDescription(`**${user.username}** ha sido expulsado permanentemente del servidor.`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Usuario', value: `<@${user.id}> \`${user.username}\``, inline: true },
        { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '📋 Razón', value: `\`\`\`${reason}\`\`\`` },
      )
      .setFooter({ text: `ID del usuario: ${user.id}` })
      .setTimestamp();

    // Respuesta pública donde se ejecutó el comando
    await interaction.reply({ embeds: [embed] });

    // Cartel en el canal de bans
    try {
      const announceChannel = await interaction.guild!.channels.fetch(ANNOUNCE_CHANNEL) as TextChannel;
      if (announceChannel?.isTextBased()) {
        await announceChannel.send({ embeds: [embed] });
      }
    } catch { /* canal no encontrado o sin permisos */ }
  },
};
