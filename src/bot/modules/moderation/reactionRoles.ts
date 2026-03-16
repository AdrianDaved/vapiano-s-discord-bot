import { ButtonInteraction, GuildMember } from 'discord.js';
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
    await interaction.reply({ content: 'Este boton de rol ya no esta configurado.', ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  const role = interaction.guild.roles.cache.get(reactionRole.roleId);

  if (!role) {
    await interaction.reply({ content: 'El rol configurado ya no existe.', ephemeral: true });
    return;
  }

  // Check bot can assign this role
  const botMember = interaction.guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) {
    await interaction.reply({ content: 'No puedo asignar este rol (esta por encima de mi rol mas alto).', ephemeral: true });
    return;
  }

  try {
    if (reactionRole.type === 'give') {
      // Only give, never remove
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        await interaction.reply({ content: `Se te asigno el rol **${role.name}**.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `Ya tienes el rol **${role.name}**.`, ephemeral: true });
      }
    } else if (reactionRole.type === 'remove') {
      // Only remove, never give
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Se removio el rol **${role.name}**.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `No tienes el rol **${role.name}**.`, ephemeral: true });
      }
    } else {
      // Toggle (default)
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Se removio el rol **${role.name}**.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `Se agrego el rol **${role.name}**.`, ephemeral: true });
      }
    }
  } catch (err) {
    logger.error(`[ReactionRoles] Error toggling role: ${err}`);
    await interaction.reply({ content: 'No se pudieron actualizar tus roles. Intenta de nuevo.', ephemeral: true });
  }
}
