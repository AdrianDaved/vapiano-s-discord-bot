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
    .setName('level')
    .setDescription('Leveling system commands')
    .addSubcommand((sub) =>
      sub
        .setName('rank')
        .setDescription('View your or another user\'s rank')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View the XP leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('setxp')
        .setDescription('Set a user\'s XP (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('xp').setDescription('XP amount').setRequired(true).setMinValue(0))
    )
    .addSubcommand((sub) =>
      sub
        .setName('setlevel')
        .setDescription('Set a user\'s level (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('level').setDescription('Level').setRequired(true).setMinValue(0))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reward')
        .setDescription('Add a level reward role')
        .addIntegerOption((opt) => opt.setName('level').setDescription('Level to reach').setRequired(true).setMinValue(1))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to award').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('rewards').setDescription('List all level reward roles')
    )
    .addSubcommand((sub) =>
      sub
        .setName('removereward')
        .setDescription('Remove a level reward')
        .addIntegerOption((opt) => opt.setName('level').setDescription('Level of the reward').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to remove').setRequired(true))
    ),
  module: 'leveling',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'rank': {
        const user = interaction.options.getUser('user') || interaction.user;

        let userLevel = await prisma.userLevel.findUnique({
          where: { guildId_userId: { guildId, userId: user.id } },
        });

        if (!userLevel) {
          await interaction.reply({
            content: `${user.id === interaction.user.id ? 'You have' : `${user.username} has`} no XP yet.`,
            ephemeral: true,
          });
          return;
        }

        // Get rank position
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
            { name: 'Rank', value: `#${rank + 1}`, inline: true },
            { name: 'Level', value: userLevel.level.toString(), inline: true },
            { name: 'XP', value: `${userLevel.xp.toLocaleString()} total`, inline: true },
            { name: 'Messages', value: userLevel.messages.toLocaleString(), inline: true },
            { name: 'Progress', value: `${progressBar} ${progressPercent}%\n${xpIntoLevel}/${currentLevelXp} XP to next level` }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'leaderboard': {
        const topUsers = await prisma.userLevel.findMany({
          where: { guildId },
          orderBy: { xp: 'desc' },
          take: 15,
        });

        if (topUsers.length === 0) {
          await interaction.reply({ content: 'No leveling data yet.', ephemeral: true });
          return;
        }

        const lines = topUsers.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> — Level **${u.level}** (${u.xp.toLocaleString()} XP)`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('leveling'))
          .setTitle('XP Leaderboard')
          .setDescription(lines.join('\n'))
          .setFooter({ text: interaction.guild?.name || '' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'setxp': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Only administrators can set XP.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const xp = interaction.options.getInteger('xp', true);
        const level = levelFromXp(xp);

        await prisma.userLevel.upsert({
          where: { guildId_userId: { guildId, userId: user.id } },
          create: { guildId, userId: user.id, xp, level },
          update: { xp, level },
        });

        await interaction.reply({
          content: `Set **${user.username}**'s XP to **${xp}** (level ${level}).`,
          ephemeral: true,
        });
        break;
      }

      case 'setlevel': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Only administrators can set levels.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const targetLevel = interaction.options.getInteger('level', true);

        // Calculate total XP for the target level
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
          content: `Set **${user.username}**'s level to **${targetLevel}** (${totalXp} XP).`,
          ephemeral: true,
        });
        break;
      }

      case 'reward': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          await interaction.reply({ content: 'You need the **Manage Roles** permission.', ephemeral: true });
          return;
        }

        const level = interaction.options.getInteger('level', true);
        const role = interaction.options.getRole('role', true);

        await prisma.levelReward.upsert({
          where: { guildId_level_roleId: { guildId, level, roleId: role.id } },
          create: { guildId, level, roleId: role.id },
          update: {},
        });

        await interaction.reply({
          content: `Users will receive **${role.name}** upon reaching level **${level}**.`,
          ephemeral: true,
        });
        break;
      }

      case 'rewards': {
        const rewards = await prisma.levelReward.findMany({
          where: { guildId },
          orderBy: { level: 'asc' },
        });

        if (rewards.length === 0) {
          await interaction.reply({ content: 'No level rewards configured.', ephemeral: true });
          return;
        }

        const lines = rewards.map(
          (r) => `Level **${r.level}** → <@&${r.roleId}>`
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('leveling'))
          .setTitle('Level Rewards')
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'removereward': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          await interaction.reply({ content: 'You need the **Manage Roles** permission.', ephemeral: true });
          return;
        }

        const level = interaction.options.getInteger('level', true);
        const role = interaction.options.getRole('role', true);

        const deleted = await prisma.levelReward.deleteMany({
          where: { guildId, level, roleId: role.id },
        });

        if (deleted.count === 0) {
          await interaction.reply({ content: 'No matching level reward found.', ephemeral: true });
          return;
        }

        await interaction.reply({
          content: `Removed **${role.name}** reward from level **${level}**.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
