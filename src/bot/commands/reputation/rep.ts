import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Sistema de reputación')
    .addSubcommand((sub) =>
      sub
        .setName('dar')
        .setDescription('Dar reputación a un usuario')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario al que dar rep').setRequired(true))
        .addStringOption((opt) => opt.setName('razon').setDescription('Razón para dar rep').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ver')
        .setDescription('Ver tu reputación o la de otro usuario')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('ranking').setDescription('Ver el ranking de reputación')
    )
    .addSubcommand((sub) =>
      sub
        .setName('historial')
        .setDescription('Ver rep reciente dada/recibida')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('quitar')
        .setDescription('Quitar reputación a un usuario (solo mods)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario al que quitar rep').setRequired(true))
        .addIntegerOption((opt) => opt.setName('cantidad').setDescription('Cantidad de rep a quitar (por defecto: 1)').setRequired(false).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reiniciar')
        .setDescription('Reiniciar toda la reputación de un usuario (solo admins)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a reiniciar').setRequired(true))
    ),
  module: 'reputation',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'dar': {
        const target = interaction.options.getUser('usuario', true);
        const reason = interaction.options.getString('razon');

        // No puedes darte rep a ti mismo
        if (target.id === interaction.user.id) {
          await interaction.reply({ content: 'No puedes darte reputación a ti mismo.', ephemeral: true });
          return;
        }

        // No puedes dar rep a bots
        if (target.bot) {
          await interaction.reply({ content: 'No puedes dar reputación a bots.', ephemeral: true });
          return;
        }

        // Dar rep
        await prisma.reputation.create({
          data: {
            guildId,
            userId: target.id,
            giverId: interaction.user.id,
            reason: reason || null,
          },
        });

        // Contar rep total del objetivo
        const totalRep = await prisma.reputation.count({
          where: { guildId, userId: target.id },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setDescription(`${interaction.user} dio **+1 rep** a ${target}${reason ? `\n**Razón:** ${reason}` : ''}`)
          .setFooter({ text: `${target.username} ahora tiene ${totalRep} rep` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'ver': {
        const user = interaction.options.getUser('usuario') || interaction.user;

        const totalRep = await prisma.reputation.count({
          where: { guildId, userId: user.id },
        });

        const givenRep = await prisma.reputation.count({
          where: { guildId, giverId: user.id },
        });

        // Posición en el ranking
        const allUsers = await prisma.reputation.groupBy({
          by: ['userId'],
          where: { guildId },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
        });

        const rank = allUsers.findIndex((u) => u.userId === user.id) + 1;

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'Reputación', value: `**${totalRep}** rep`, inline: true },
            { name: 'Posición', value: rank > 0 ? `#${rank}` : 'Sin ranking', inline: true },
            { name: 'Rep Dada', value: `${givenRep}`, inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'ranking': {
        const topUsers = await prisma.reputation.groupBy({
          by: ['userId'],
          where: { guildId },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 15,
        });

        if (topUsers.length === 0) {
          await interaction.reply({ content: 'Aún no hay datos de reputación. ¡Empieza dando rep con `/rep dar`!', ephemeral: true });
          return;
        }

        const lines = topUsers.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> — **${u._count.userId}** rep`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle('Ranking de Reputación')
          .setDescription(lines.join('\n'))
          .setFooter({ text: interaction.guild?.name || '' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'historial': {
        const user = interaction.options.getUser('usuario') || interaction.user;

        const recent = await prisma.reputation.findMany({
          where: {
            guildId,
            OR: [{ userId: user.id }, { giverId: user.id }],
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (recent.length === 0) {
          await interaction.reply({ content: 'No se encontró historial de reputación.', ephemeral: true });
          return;
        }

        const lines = recent.map((r) => {
          const time = `<t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`;
          if (r.userId === user.id) {
            return `${time} Recibida de <@${r.giverId}>${r.reason ? ` — *${r.reason}*` : ''}`;
          } else {
            return `${time} Dada a <@${r.userId}>${r.reason ? ` — *${r.reason}*` : ''}`;
          }
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle(`Historial de Rep — ${user.username}`)
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'quitar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
          await interaction.reply({ content: 'Necesitas el permiso **Moderar Miembros**.', ephemeral: true });
          return;
        }

        const target = interaction.options.getUser('usuario', true);
        const amount = interaction.options.getInteger('cantidad') || 1;

        // Eliminar las N entradas de rep más recientes para este usuario
        const reps = await prisma.reputation.findMany({
          where: { guildId, userId: target.id },
          orderBy: { createdAt: 'desc' },
          take: amount,
          select: { id: true },
        });

        if (reps.length === 0) {
          await interaction.reply({ content: `${target.username} no tiene reputación que quitar.`, ephemeral: true });
          return;
        }

        await prisma.reputation.deleteMany({
          where: { id: { in: reps.map((r) => r.id) } },
        });

        const remaining = await prisma.reputation.count({
          where: { guildId, userId: target.id },
        });

        await interaction.reply({
          content: `Se quitaron **${reps.length}** rep de **${target.username}**. Ahora tiene **${remaining}** rep.`,
          ephemeral: true,
        });
        break;
      }

      case 'reiniciar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Solo los administradores pueden reiniciar la reputación.', ephemeral: true });
          return;
        }

        const target = interaction.options.getUser('usuario', true);

        const deleted = await prisma.reputation.deleteMany({
          where: { guildId, userId: target.id },
        });

        await interaction.reply({
          content: `Se reinició toda la reputación de **${target.username}** (${deleted.count} rep eliminada).`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
