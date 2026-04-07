import { ButtonInteraction, GuildMember, MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Handle emoji reaction add/remove for reaction roles.
 */
export async function handleEmojiReactionRole(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  action: 'add' | 'remove'
): Promise<void> {
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();
    if (!reaction.message.guild) return;

    const emoji = reaction.emoji.id
      ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`
      : reaction.emoji.name || '';

    const rr = await prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId: reaction.message.id, emoji } },
    });
    if (!rr) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(rr.roleId);
    if (!role) return;

    const botMember = guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) return;

    if (action === 'add') {
      if (rr.type === 'remove') {
        await member.roles.remove(role).catch(() => {});
      } else {
        await member.roles.add(role).catch(() => {});
      }
    } else {
      // reaction removed
      if (rr.type === 'toggle' || rr.type === 'give') {
        await member.roles.remove(role).catch(() => {});
      }
    }
  } catch (err) {
    logger.error(`[ReactionRoles] Error handling emoji reaction: ${err}`);
  }
}

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
    await interaction.reply({ content: 'Este boton de rol ya no esta configurado.', flags: 64 });
    return;
  }

  const member = interaction.member as GuildMember;
  const role = interaction.guild.roles.cache.get(reactionRole.roleId);

  if (!role) {
    await interaction.reply({ content: 'El rol configurado ya no existe.', flags: 64 });
    return;
  }

  // Check bot can assign this role
  const botMember = interaction.guild.members.me;
  if (!botMember || role.position >= botMember.roles.highest.position) {
    await interaction.reply({ content: 'No puedo asignar este rol (esta por encima de mi rol mas alto).', flags: 64 });
    return;
  }

  try {
    if (reactionRole.type === 'give') {
      // Only give, never remove
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        await interaction.reply({ content: `Se te asigno el rol **${role.name}**.`, flags: 64 });
      } else {
        await interaction.reply({ content: `Ya tienes el rol **${role.name}**.`, flags: 64 });
      }
    } else if (reactionRole.type === 'remove') {
      // Only remove, never give
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Se removio el rol **${role.name}**.`, flags: 64 });
      } else {
        await interaction.reply({ content: `No tienes el rol **${role.name}**.`, flags: 64 });
      }
    } else {
      // Toggle (default)
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Se removio el rol **${role.name}**.`, flags: 64 });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `Se agrego el rol **${role.name}**.`, flags: 64 });
      }
    }
  } catch (err) {
    logger.error(`[ReactionRoles] Error toggling role: ${err}`);
    await interaction.reply({ content: 'No se pudieron actualizar tus roles. Intenta de nuevo.', flags: 64 });
  }
}
