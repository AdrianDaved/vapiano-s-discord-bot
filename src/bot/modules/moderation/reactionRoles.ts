import { ButtonInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Handle reaction/button role toggle when a user clicks a role button.
 */
export async function handleReactionRoleButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) return;

  // customId format: rr_<reactionRoleId>
  const rrId = interaction.customId.replace('rr_', '');

  const reactionRole = await prisma.reactionRole.findUnique({
    where: { id: rrId },
  });

  if (!reactionRole) {
    await interaction.reply({ content: 'This role button is no longer configured.', ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  const role = interaction.guild.roles.cache.get(reactionRole.roleId);

  if (!role) {
    await interaction.reply({ content: 'The configured role no longer exists.', ephemeral: true });
    return;
  }

  // Check bot can assign this role
  const botMember = interaction.guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) {
    await interaction.reply({ content: 'I cannot assign this role (it is above my highest role).', ephemeral: true });
    return;
  }

  try {
    if (reactionRole.type === 'give') {
      // Only give, never remove
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        await interaction.reply({ content: `You have been given the **${role.name}** role.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `You already have the **${role.name}** role.`, ephemeral: true });
      }
    } else if (reactionRole.type === 'remove') {
      // Only remove, never give
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `The **${role.name}** role has been removed.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `You don't have the **${role.name}** role.`, ephemeral: true });
      }
    } else {
      // Toggle (default)
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Removed the **${role.name}** role.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `Added the **${role.name}** role.`, ephemeral: true });
      }
    }
  } catch (err) {
    logger.error(`[ReactionRoles] Error toggling role: ${err}`);
    await interaction.reply({ content: 'Failed to update your roles. Please try again.', ephemeral: true });
  }
}
