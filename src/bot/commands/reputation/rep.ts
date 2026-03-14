import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, getGuildConfig } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Reputation system commands')
    .addSubcommand((sub) =>
      sub
        .setName('give')
        .setDescription('Give reputation to a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to give rep to').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for giving rep').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('Check your or another user\'s reputation')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View the reputation leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View recent rep given/received')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove reputation from a user (mod only)')
        .addUserOption((opt) => opt.setName('user').setDescription('User to remove rep from').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of rep to remove (default: 1)').setRequired(false).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset all reputation for a user (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('User to reset').setRequired(true))
    ),
  module: 'reputation',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'give': {
        const target = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason');

        // Can't give rep to yourself
        if (target.id === interaction.user.id) {
          await interaction.reply({ content: 'You cannot give reputation to yourself.', ephemeral: true });
          return;
        }

        // Can't give rep to bots
        if (target.bot) {
          await interaction.reply({ content: 'You cannot give reputation to bots.', ephemeral: true });
          return;
        }

        // Check cooldown
        const config = await getGuildConfig(guildId);
        const cooldownSeconds = config.repCooldown || 86400;

        const lastGiven = await prisma.reputation.findFirst({
          where: {
            guildId,
            giverId: interaction.user.id,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastGiven) {
          const elapsed = (Date.now() - lastGiven.createdAt.getTime()) / 1000;
          if (elapsed < cooldownSeconds) {
            const remaining = cooldownSeconds - Math.floor(elapsed);
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            await interaction.reply({
              content: `You must wait **${hours}h ${minutes}m** before giving rep again.`,
              ephemeral: true,
            });
            return;
          }
        }

        // Give rep
        await prisma.reputation.create({
          data: {
            guildId,
            userId: target.id,
            giverId: interaction.user.id,
            reason: reason || null,
          },
        });

        // Count total rep for target
        const totalRep = await prisma.reputation.count({
          where: { guildId, userId: target.id },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setDescription(`${interaction.user} gave **+1 rep** to ${target}${reason ? `\n**Reason:** ${reason}` : ''}`)
          .setFooter({ text: `${target.username} now has ${totalRep} rep` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'check': {
        const user = interaction.options.getUser('user') || interaction.user;

        const totalRep = await prisma.reputation.count({
          where: { guildId, userId: user.id },
        });

        const givenRep = await prisma.reputation.count({
          where: { guildId, giverId: user.id },
        });

        // Rank position
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
            { name: 'Reputation', value: `**${totalRep}** rep`, inline: true },
            { name: 'Rank', value: rank > 0 ? `#${rank}` : 'Unranked', inline: true },
            { name: 'Rep Given', value: `${givenRep}`, inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'leaderboard': {
        const topUsers = await prisma.reputation.groupBy({
          by: ['userId'],
          where: { guildId },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 15,
        });

        if (topUsers.length === 0) {
          await interaction.reply({ content: 'No reputation data yet. Start giving rep with `/rep give`!', ephemeral: true });
          return;
        }

        const lines = topUsers.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> — **${u._count.userId}** rep`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle('Reputation Leaderboard')
          .setDescription(lines.join('\n'))
          .setFooter({ text: interaction.guild?.name || '' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'history': {
        const user = interaction.options.getUser('user') || interaction.user;

        const recent = await prisma.reputation.findMany({
          where: {
            guildId,
            OR: [{ userId: user.id }, { giverId: user.id }],
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (recent.length === 0) {
          await interaction.reply({ content: 'No reputation history found.', ephemeral: true });
          return;
        }

        const lines = recent.map((r) => {
          const time = `<t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`;
          if (r.userId === user.id) {
            return `${time} Received from <@${r.giverId}>${r.reason ? ` — *${r.reason}*` : ''}`;
          } else {
            return `${time} Given to <@${r.userId}>${r.reason ? ` — *${r.reason}*` : ''}`;
          }
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle(`Rep History — ${user.username}`)
          .setDescription(lines.join('\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'remove': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
          await interaction.reply({ content: 'You need the **Moderate Members** permission.', ephemeral: true });
          return;
        }

        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount') || 1;

        // Delete the most recent N rep entries for this user
        const reps = await prisma.reputation.findMany({
          where: { guildId, userId: target.id },
          orderBy: { createdAt: 'desc' },
          take: amount,
          select: { id: true },
        });

        if (reps.length === 0) {
          await interaction.reply({ content: `${target.username} has no reputation to remove.`, ephemeral: true });
          return;
        }

        await prisma.reputation.deleteMany({
          where: { id: { in: reps.map((r) => r.id) } },
        });

        const remaining = await prisma.reputation.count({
          where: { guildId, userId: target.id },
        });

        await interaction.reply({
          content: `Removed **${reps.length}** rep from **${target.username}**. They now have **${remaining}** rep.`,
          ephemeral: true,
        });
        break;
      }

      case 'reset': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Only administrators can reset reputation.', ephemeral: true });
          return;
        }

        const target = interaction.options.getUser('user', true);

        const deleted = await prisma.reputation.deleteMany({
          where: { guildId, userId: target.id },
        });

        await interaction.reply({
          content: `Reset all reputation for **${target.username}** (${deleted.count} rep removed).`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
