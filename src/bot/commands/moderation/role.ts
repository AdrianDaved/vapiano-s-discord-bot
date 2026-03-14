/**
 * /role command — Mass role management.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  GuildMember,
  Role,
} from 'discord.js';
import { moduleColor } from '../../utils';
import logger from '../../../shared/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage roles for members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a role to a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('all')
        .setDescription('Add or remove a role from all members')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to add/remove').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'Add to all', value: 'add' },
              { name: 'Remove from all', value: 'remove' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('View info about a role')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to inspect').setRequired(true))
    ),
  module: 'moderation',
  cooldown: 5,
  permissions: [PermissionFlagsBits.ManageRoles],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    switch (sub) {
      case 'add': {
        const user = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true) as Role;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
          await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
          return;
        }

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'You cannot manage this role (it may be higher than yours).', ephemeral: true });
          return;
        }

        await member.roles.add(role);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(`Added ${role} to ${member}.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'remove': {
        const user = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true) as Role;
        const member = await guild.members.fetch(user.id).catch(() => null);

        if (!member) {
          await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
          return;
        }

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'You cannot manage this role.', ephemeral: true });
          return;
        }

        await member.roles.remove(role);
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(`Removed ${role} from ${member}.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'all': {
        const role = interaction.options.getRole('role', true) as Role;
        const action = interaction.options.getString('action', true);

        if (!canManageRole(interaction.member as GuildMember, role, guild)) {
          await interaction.reply({ content: 'You cannot manage this role.', ephemeral: true });
          return;
        }

        await interaction.deferReply();

        const members = await guild.members.fetch();
        let count = 0;

        for (const member of members.values()) {
          try {
            if (action === 'add' && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              count++;
            } else if (action === 'remove' && member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              count++;
            }
          } catch {
            // Skip members we can't modify
          }
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(moduleColor('moderation'))
              .setDescription(
                action === 'add'
                  ? `Added ${role} to **${count}** member(s).`
                  : `Removed ${role} from **${count}** member(s).`
              )
              .setTimestamp(),
          ],
        });
        break;
      }

      case 'info': {
        const role = interaction.options.getRole('role', true) as Role;

        const embed = new EmbedBuilder()
          .setColor(role.color || 0x99aab5)
          .setTitle(`Role: ${role.name}`)
          .addFields(
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Position', value: role.position.toString(), inline: true },
            { name: 'Members', value: role.members.size.toString(), inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Managed', value: role.managed ? 'Yes (bot/integration)' : 'No', inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  },
};

function canManageRole(member: GuildMember, role: Role, guild: any): boolean {
  // Check the bot can manage this role
  const botMember = guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) return false;
  // Check the user's highest role is above the target role
  if (role.position >= member.roles.highest.position) return false;
  return true;
}
