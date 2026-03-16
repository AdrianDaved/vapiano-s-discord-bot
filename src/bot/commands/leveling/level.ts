import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, xpForLevel, levelFromXp } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('nivel')
    .setDescription('Sistema de niveles')
    .addSubcommand((sub) =>
      sub
        .setName('rango')
        .setDescription('Ver tu rango o el de otro usuario')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('ranking').setDescription('Ver el ranking de XP')
    )
    .addSubcommand((sub) =>
      sub
        .setName('establecerxp')
        .setDescription('Establecer la XP de un usuario (solo admins)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario objetivo').setRequired(true))
        .addIntegerOption((opt) => opt.setName('xp').setDescription('Cantidad de XP').setRequired(true).setMinValue(0))
    )
    .addSubcommand((sub) =>
      sub
        .setName('establecernivel')
        .setDescription('Establecer el nivel de un usuario (solo admins)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario objetivo').setRequired(true))
        .addIntegerOption((opt) => opt.setName('nivel').setDescription('Nivel').setRequired(true).setMinValue(0))
    )
    .addSubcommand((sub) =>
      sub
        .setName('recompensa')
        .setDescription('Añadir un rol de recompensa por nivel')
        .addIntegerOption((opt) => opt.setName('nivel').setDescription('Nivel a alcanzar').setRequired(true).setMinValue(1))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a otorgar').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('recompensas').setDescription('Listar todos los roles de recompensa por nivel')
    )
    .addSubcommand((sub) =>
      sub
        .setName('quitarrecompensa')
        .setDescription('Quitar una recompensa de nivel')
        .addIntegerOption((opt) => opt.setName('nivel').setDescription('Nivel de la recompensa').setRequired(true))
        .addRoleOption((opt) => opt.setName('rol').setDescription('Rol a quitar').setRequired(true))
    ),
  module: 'leveling',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'rango': {
        const user = interaction.options.getUser('usuario') || interaction.user;

        let userLevel = await prisma.userLevel.findUnique({
          where: { guildId_userId: { guildId, userId: user.id } },
        });

        if (!userLevel) {
          await interaction.reply({
            content: `${user.id === interaction.user.id ? 'No tienes' : `${user.username} no tiene`} XP todavía.`,
            ephemeral: true,
          });
          return;
        }

        // Obtener posición en el ranking
        const rank = await prisma.userLevel.count({
          where: { guildId, xp: { gt: userLevel.xp } },
        });

        const currentLevelXp = xpForLevel(userLevel.level);
        let xpIntoLevel = userLevel.xp;
        for (let i = 0; i < userLevel.level; i++) {
          xpIntoLevel -= xpForLevel(i);
        }

        const progressPercent = Math.round((xpIntoLevel / currentLevelXp) * 100);
        const barFilled = Math.round(progressPercent / 5);
        const progressBar = '▓'.repeat(barFilled) + '░'.repeat(20 - barFilled);

        const embed = new EmbedBuilder()
          .setColor(moduleColor('leveling'))
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'Posición', value: `#${rank + 1}`, inline: true },
            { name: 'Nivel', value: userLevel.level.toString(), inline: true },
            { name: 'XP', value: `${userLevel.xp.toLocaleString()} total`, inline: true },
            { name: 'Mensajes', value: userLevel.messages.toLocaleString(), inline: true },
            { name: 'Progreso', value: `${progressBar} ${progressPercent}%\n${xpIntoLevel}/${currentLevelXp} XP para el siguiente nivel` }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'ranking': {
        const topUsers = await prisma.userLevel.findMany({
          where: { guildId },
          orderBy: { xp: 'desc' },
          take: 15,
        });

        if (topUsers.length === 0) {
          await interaction.reply({ content: 'Aún no hay datos de niveles.', ephemeral: true });
          return;
        }

        const lines = topUsers.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> — Nivel **${u.level}** (${u.xp.toLocaleString()} XP)`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('leveling'))
          .setTitle('Ranking de XP')
          .setDescription(lines.join('\n'))
          .setFooter({ text: interaction.guild?.name || '' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'establecerxp': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Solo los administradores pueden establecer XP.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('usuario', true);
        const xp = interaction.options.getInteger('xp', true);
        const level = levelFromXp(xp);

        await prisma.userLevel.upsert({
          where: { guildId_userId: { guildId, userId: user.id } },
          create: { guildId, userId: user.id, xp, level },
          update: { xp, level },
        });

        await interaction.reply({
          content: `Se estableció la XP de **${user.username}** a **${xp}** (nivel ${level}).`,
          ephemeral: true,
        });
        break;
      }

      case 'establecernivel': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Solo los administradores pueden establecer niveles.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('usuario', true);
        const targetLevel = interaction.options.getInteger('nivel', true);

        // Calcular XP total para el nivel objetivo
        let totalXp = 0;
        for (let i = 0; i < targetLevel; i++) {
          totalXp += xpForLevel(i);
        }

        await prisma.userLevel.upsert({
          where: { guildId_userId: { guildId, userId: user.id } },
          create: { guildId, userId: user.id, xp: totalXp, level: targetLevel },
          update: { xp: totalXp, level: targetLevel },
        });

        await interaction.reply({
          content: `Se estableció el nivel de **${user.username}** a **${targetLevel}** (${totalXp} XP).`,
          ephemeral: true,
        });
        break;
      }

      case 'recompensa': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          await interaction.reply({ content: 'Necesitas el permiso **Gestionar Roles**.', ephemeral: true });
          return;
        }

        const level = interaction.options.getInteger('nivel', true);
        const role = interaction.options.getRole('rol', true);

        await prisma.levelReward.upsert({
          where: { guildId_level_roleId: { guildId, level, roleId: role.id } },
          create: { guildId, level, roleId: role.id },
          update: {},
        });

        await interaction.reply({
          content: `Los usuarios recibirán **${role.name}** al alcanzar el nivel **${level}**.`,
          ephemeral: true,
        });
        break;
      }

      case 'recompensas': {
        const rewards = await prisma.levelReward.findMany({
          where: { guildId },
          orderBy: { level: 'asc' },
        });

        if (rewards.length === 0) {
          await interaction.reply({ content: 'No hay recompensas de nivel configuradas.', ephemeral: true });
          return;
        }

        const lines = rewards.map(
          (r) => `Nivel **${r.level}** → <@&${r.roleId}>`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('leveling'))
          .setTitle('Recompensas de Nivel')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'quitarrecompensa': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          await interaction.reply({ content: 'Necesitas el permiso **Gestionar Roles**.', ephemeral: true });
          return;
        }

        const level = interaction.options.getInteger('nivel', true);
        const role = interaction.options.getRole('rol', true);

        const deleted = await prisma.levelReward.deleteMany({
          where: { guildId, level, roleId: role.id },
        });

        if (deleted.count === 0) {
          await interaction.reply({ content: 'No se encontró la recompensa de nivel.', ephemeral: true });
          return;
        }

        await interaction.reply({
          content: `Se quitó la recompensa **${role.name}** del nivel **${level}**.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
