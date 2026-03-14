import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, formatDuration, parseDuration, getGuildConfig } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for warning').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to clear').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('mute')
        .setDescription('Timeout a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to mute').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 1h, 30m, 1d)').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to unmute').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption((opt) => opt.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false))
        .addIntegerOption((opt) => opt.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    )
    .addSubcommand((sub) =>
      sub
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to tempban').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration (e.g. 1d, 1w)').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unban')
        .setDescription('Unban a user')
        .addStringOption((opt) => opt.setName('userid').setDescription('User ID to unban').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Delete messages from a channel')
        .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption((opt) => opt.setName('user').setDescription('Only delete messages from this user'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('lock')
        .setDescription('Lock a channel (prevent sending messages)')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to lock'))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to unlock'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View moderation history for a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to check').setRequired(true))
    ),
  module: 'moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const config = await getGuildConfig(guildId);

    switch (sub) {
      case 'warn': {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (user.id === interaction.user.id) {
          await interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });
          return;
        }

        await prisma.warning.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, reason },
        });

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: 'warn', reason },
        });

        const warnCount = await prisma.warning.count({ where: { guildId, userId: user.id } });

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('User Warned')
          .addFields(
            { name: 'User', value: `${user.username} (<@${user.id}>)`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Total Warnings', value: warnCount.toString(), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Try to DM the user
        try {
          await user.send({ embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle(`You were warned in ${interaction.guild!.name}`)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp()
          ]});
        } catch { /* DMs may be closed */ }

        await sendModLog(interaction, config, embed);
        break;
      }

      case 'warnings': {
        const user = interaction.options.getUser('user', true);
        const warnings = await prisma.warning.findMany({
          where: { guildId, userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (warnings.length === 0) {
          await interaction.reply({ content: `${user.username} has no warnings.`, ephemeral: true });
          return;
        }

        const lines = warnings.map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\n   By <@${w.moderatorId}> — <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
        );

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle(`Warnings for ${user.username}`)
          .setDescription(lines.join('\n\n'))
          .setFooter({ text: `${warnings.length} warning(s) total` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case 'clearwarnings': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Only administrators can clear warnings.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
        const deleted = await prisma.warning.deleteMany({ where: { guildId, userId: user.id } });

        await interaction.reply({
          content: `Cleared **${deleted.count}** warning(s) for ${user.username}.`,
          ephemeral: true,
        });
        break;
      }

      case 'mute': {
        const user = interaction.options.getUser('user', true);
        const durationStr = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const durationSec = parseDuration(durationStr);

        if (!durationSec || durationSec < 1) {
          await interaction.reply({ content: 'Invalid duration. Use format like `1h`, `30m`, `1d`.', ephemeral: true });
          return;
        }

        // Discord timeout max is 28 days
        if (durationSec > 28 * 86400) {
          await interaction.reply({ content: 'Maximum timeout duration is 28 days.', ephemeral: true });
          return;
        }

        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
          return;
        }

        if (!member.moderatable) {
          await interaction.reply({ content: 'I cannot timeout this user (role hierarchy).', ephemeral: true });
          return;
        }

        await member.timeout(durationSec * 1000, reason);

        await prisma.modAction.create({
          data: {
            guildId,
            userId: user.id,
            moderatorId: interaction.user.id,
            action: 'tempmute',
            reason,
            duration: durationSec,
            expiresAt: new Date(Date.now() + durationSec * 1000),
          },
        });

        const embed = new EmbedBuilder()
          .setColor(0xf47b67)
          .setTitle('User Muted')
          .addFields(
            { name: 'User', value: `${user.username} (<@${user.id}>)`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Duration', value: formatDuration(durationSec), inline: true },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case 'unmute': {
        const user = interaction.options.getUser('user', true);
        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
          return;
        }

        await member.timeout(null, `Unmuted by ${interaction.user.username}`);

        // Remove mute role if configured
        if (config.muteRoleId && member.roles.cache.has(config.muteRoleId)) {
          await member.roles.remove(config.muteRoleId).catch(() => {});
        }

        // Deactivate active mute actions
        await prisma.modAction.updateMany({
          where: { guildId, userId: user.id, action: { in: ['tempmute', 'mute'] }, active: true },
          data: { active: false },
        });

        await interaction.reply({ content: `<@${user.id}> has been unmuted.` });
        break;
      }

      case 'kick': {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
          return;
        }

        if (!member.kickable) {
          await interaction.reply({ content: 'I cannot kick this user (role hierarchy).', ephemeral: true });
          return;
        }

        // DM before kicking
        try {
          await user.send({ embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle(`You were kicked from ${interaction.guild!.name}`)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp()
          ]});
        } catch { /* DMs closed */ }

        await member.kick(reason);

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: 'kick', reason },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('User Kicked')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case 'ban': {
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') ?? 0;

        const member = interaction.guild!.members.cache.get(user.id);
        if (member && !member.bannable) {
          await interaction.reply({ content: 'I cannot ban this user (role hierarchy).', ephemeral: true });
          return;
        }

        // DM before banning
        try {
          await user.send({ embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle(`You were banned from ${interaction.guild!.name}`)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp()
          ]});
        } catch { /* DMs closed */ }

        await interaction.guild!.members.ban(user.id, {
          reason,
          deleteMessageSeconds: days * 86400,
        });

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: 'ban', reason },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('User Banned')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case 'tempban': {
        const user = interaction.options.getUser('user', true);
        const durationStr = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const durationSec = parseDuration(durationStr);

        if (!durationSec) {
          await interaction.reply({ content: 'Invalid duration.', ephemeral: true });
          return;
        }

        const member = interaction.guild!.members.cache.get(user.id);
        if (member && !member.bannable) {
          await interaction.reply({ content: 'I cannot ban this user.', ephemeral: true });
          return;
        }

        await interaction.guild!.members.ban(user.id, { reason: `Tempban: ${reason}` });

        await prisma.modAction.create({
          data: {
            guildId,
            userId: user.id,
            moderatorId: interaction.user.id,
            action: 'tempban',
            reason,
            duration: durationSec,
            expiresAt: new Date(Date.now() + durationSec * 1000),
          },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('User Temporarily Banned')
          .addFields(
            { name: 'User', value: `${user.username} (${user.id})`, inline: true },
            { name: 'Duration', value: formatDuration(durationSec), inline: true },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case 'unban': {
        const userId = interaction.options.getString('userid', true);

        try {
          await interaction.guild!.bans.remove(userId, `Unbanned by ${interaction.user.username}`);
          await prisma.modAction.updateMany({
            where: { guildId, userId, action: { in: ['ban', 'tempban'] }, active: true },
            data: { active: false },
          });
          await interaction.reply({ content: `User \`${userId}\` has been unbanned.` });
        } catch {
          await interaction.reply({ content: 'Could not unban that user. Check the ID is correct.', ephemeral: true });
        }
        break;
      }

      case 'clear': {
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user');

        const channel = interaction.channel as TextChannel;
        if (!channel) return;

        await interaction.deferReply({ ephemeral: true });

        let messages = await channel.messages.fetch({ limit: amount });
        if (targetUser) {
          messages = messages.filter((m) => m.author.id === targetUser.id);
        }

        // Filter out messages older than 14 days (Discord limitation)
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        messages = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);

        if (messages.size === 0) {
          await interaction.editReply({ content: 'No deletable messages found.' });
          return;
        }

        const deleted = await channel.bulkDelete(messages, true);
        await interaction.editReply({
          content: `Deleted **${deleted.size}** message(s)${targetUser ? ` from ${targetUser.username}` : ''}.`,
        });
        break;
      }

      case 'lock': {
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
        const reason = interaction.options.getString('reason') || 'Channel locked by moderator';

        await channel.permissionOverwrites.edit(guildId, {
          SendMessages: false,
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('🔒 Channel Locked')
          .setDescription(`This channel has been locked.\n**Reason:** ${reason}`)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `<#${channel.id}> has been locked.`, ephemeral: true });
        break;
      }

      case 'unlock': {
        const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

        await channel.permissionOverwrites.edit(guildId, {
          SendMessages: null,
        });

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🔓 Channel Unlocked')
          .setDescription('This channel has been unlocked.')
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `<#${channel.id}> has been unlocked.`, ephemeral: true });
        break;
      }

      case 'history': {
        const user = interaction.options.getUser('user', true);
        const actions = await prisma.modAction.findMany({
          where: { guildId, userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 15,
        });

        if (actions.length === 0) {
          await interaction.reply({ content: `No moderation history for ${user.username}.`, ephemeral: true });
          return;
        }

        const lines = actions.map((a) => {
          const emoji = { warn: '⚠️', mute: '🔇', tempmute: '🔇', kick: '👢', ban: '🔨', tempban: '🔨', unmute: '🔊', unban: '✅' }[a.action] || '📋';
          return `${emoji} **${a.action.toUpperCase()}** — ${a.reason}\nBy <@${a.moderatorId}> — <t:${Math.floor(a.createdAt.getTime() / 1000)}:R>${a.active ? ' (active)' : ''}`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('moderation'))
          .setTitle(`Moderation History: ${user.username}`)
          .setDescription(lines.join('\n\n'))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};

/** Send embed to the mod log channel if configured. */
async function sendModLog(interaction: ChatInputCommandInteraction, config: any, embed: EmbedBuilder): Promise<void> {
  if (!config.modLogChannelId || !interaction.guild) return;
  try {
    const logChannel = interaction.guild.channels.cache.get(config.modLogChannelId) as TextChannel;
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch { /* ignore */ }
}
