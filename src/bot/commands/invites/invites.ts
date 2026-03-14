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
    .setName('invites')
    .setDescription('Invite tracking commands')
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('View invite stats for a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('View the invite leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('who')
        .setDescription('See who invited a specific user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset invite data for a user (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('User to reset').setRequired(true))
    ),
  module: 'invites',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'info': {
        const user = interaction.options.getUser('user') || interaction.user;

        const [total, fakes, leaves] = await Promise.all([
          prisma.invite.count({ where: { guildId, inviterId: user.id } }),
          prisma.invite.count({ where: { guildId, inviterId: user.id, fake: true } }),
          prisma.invite.count({ where: { guildId, inviterId: user.id, left: true } }),
        ]);

        const valid = total - fakes - leaves;

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setAuthor({ name: `${user.username}'s Invites`, iconURL: user.displayAvatarURL() })
          .addFields(
            { name: 'Total', value: valid.toString(), inline: true },
            { name: 'Regular', value: (total - fakes).toString(), inline: true },
            { name: 'Fake', value: fakes.toString(), inline: true },
            { name: 'Left', value: leaves.toString(), inline: true }
          )
          .setFooter({ text: `Valid invites = Total - Fake - Left` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'leaderboard': {
        const inviterStats = await prisma.invite.groupBy({
          by: ['inviterId'],
          where: { guildId, fake: false, left: false },
          _count: { inviterId: true },
          orderBy: { _count: { inviterId: 'desc' } },
          take: 15,
        });

        if (inviterStats.length === 0) {
          await interaction.reply({ content: 'No invite data found yet.', ephemeral: true });
          return;
        }

        const lines = await Promise.all(
          inviterStats.map(async (stat, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
            return `${medal} <@${stat.inviterId}> — **${stat._count.inviterId}** invites`;
          })
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setTitle('Invite Leaderboard')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${interaction.guild?.name}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'who': {
        const user = interaction.options.getUser('user', true);

        const inviteRecord = await prisma.invite.findFirst({
          where: { guildId, invitedId: user.id },
          orderBy: { createdAt: 'desc' },
        });

        if (!inviteRecord) {
          await interaction.reply({
            content: `Could not determine who invited **${user.username}**. They may have joined via a vanity URL or the invite data was not tracked.`,
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setDescription(
            `**${user.username}** was invited by <@${inviteRecord.inviterId}> using code \`${inviteRecord.code}\`${inviteRecord.fake ? ' ⚠️ (flagged as fake)' : ''}${inviteRecord.left ? ' (has since left)' : ''}`
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'reset': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Only administrators can reset invite data.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const deleted = await prisma.invite.deleteMany({
          where: { guildId, inviterId: user.id },
        });

        await interaction.reply({
          content: `Reset **${deleted.count}** invite records for ${user.username}.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};
