import {
  Events,
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
  PermissionsBitField,
  Collection,
} from 'discord.js';
import { BotClient } from '../../shared/types';
import logger from '../../shared/logger';
import { getGuildConfig } from '../utils';
import {
  handleTicketButton,
  handleTicketCloseButton,
  handleTicketConfirmClose,
  handleTicketCancelClose,
  handleTicketReopen,
  handleTicketDelete,
  handleTicketClaim,
  handleTicketTranscriptButton,
  handleTicketDropdown,
  handleTicketFormSubmit,
  handleTicketFeedback,
} from '../modules/tickets/ticketManager';
import { handleReactionRoleButton } from '../modules/moderation/reactionRoles';
import { handlePollVote } from '../modules/automation/polls';
import { handleGiveawayButton } from '../modules/giveaway/giveawayManager';
import prisma from '../../database/client';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: BotClient) {
    // ─── Slash Commands ──────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Cooldown check
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name)!;
      const cooldownAmount = (command.cooldown ?? 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
        if (now < expirationTime) {
          const remaining = ((expirationTime - now) / 1000).toFixed(1);
          await interaction.reply({
            content: `Espera ${remaining}s antes de usar \`/${command.data.name}\` de nuevo.`,
            ephemeral: true,
          });
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      // Permission check
      if (command.permissions && command.permissions.length > 0 && interaction.memberPermissions) {
        const missing = command.permissions.filter(
          (p) => !interaction.memberPermissions!.has(p)
        );
        if (missing.length > 0) {
          await interaction.reply({
            content: 'No tienes permiso para usar este comando.',
            ephemeral: true,
          });
          return;
        }
      }

      // Module enabled check + role restriction
      if (command.module && interaction.guildId) {
        const config = await getGuildConfig(interaction.guildId);
        const moduleField = `${command.module}Enabled`;
        if (config[moduleField] === false && command.module !== 'config') {
          await interaction.reply({
            content: `El módulo **${command.module}** está desactivado. Actívalo con \`/configuracion modulo activar name:${command.module}\`.`,
            ephemeral: true,
          });
          return;
        }

        // Check module role restrictions (skip for admins and 'config' module)
        if (command.module !== 'config' && interaction.member) {
          const allowedRoles = (config.moduleAllowedRoles as Record<string, string[]> | null)?.[command.module] ?? [];
          if (allowedRoles.length > 0) {
            const memberRoles = (interaction.member as any).roles?.cache ?? new Map();
            const hasRole = allowedRoles.some((rid: string) => memberRoles.has(rid));
            const isAdmin = (interaction.memberPermissions as PermissionsBitField)?.has('Administrator') ?? false;
            if (!hasRole && !isAdmin) {
              await interaction.reply({
                content: `No tienes permiso para usar comandos de **${command.module}**.`,
                ephemeral: true,
              });
              return;
            }
          }
        }
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        logger.error(`Error executing /${command.data.name}: ${err}`);
        const reply = {
          content: 'Ocurrió un error al ejecutar este comando.',
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    // ─── Button Interactions ─────────────────────────────
    if (interaction.isButton()) {
      const btn = interaction as ButtonInteraction;
      const customId = btn.customId;

      try {
        // ── Ticket buttons ────────────────────────
        if (customId.startsWith('ticket_create_')) {
          await handleTicketButton(btn);
        } else if (customId === 'ticket_close') {
          await handleTicketCloseButton(btn);
        } else if (customId.startsWith('ticket_confirm_close_')) {
          await handleTicketConfirmClose(btn);
        } else if (customId === 'ticket_cancel_close') {
          await handleTicketCancelClose(btn);
        } else if (customId === 'ticket_reopen') {
          await handleTicketReopen(btn);
        } else if (customId === 'ticket_delete') {
          await handleTicketDelete(btn);
        } else if (customId === 'ticket_claim') {
          await handleTicketClaim(btn);
        } else if (customId === 'ticket_transcript') {
          await handleTicketTranscriptButton(btn);
        } else if (customId.startsWith('ticket_feedback_')) {
          await handleTicketFeedback(btn);
        }
        // ── Other buttons ─────────────────────────
        else if (customId.startsWith('rr_')) {
          await handleReactionRoleButton(btn);
        } else if (customId.startsWith('poll_')) {
          await handlePollVote(btn);
        } else if (customId === 'giveaway_enter') {
          await handleGiveawayButton(btn);
        } else if (customId.startsWith('suggest_up_') || customId.startsWith('suggest_down_')) {
          await handleSuggestionVote(btn);
        }
      } catch (err) {
        logger.error(`Error handling button ${customId}: ${err}`);
        if (!btn.replied && !btn.deferred) {
          await btn.reply({ content: 'Ocurrió un error.', ephemeral: true }).catch(() => {});
        }
      }
    }

    // ─── Select Menu Interactions ────────────────────────
    if (interaction.isStringSelectMenu()) {
      const select = interaction as StringSelectMenuInteraction;
      const customId = select.customId;

      try {
        if (customId === 'ticket_panel_select') {
          await handleTicketDropdown(select);
        }
      } catch (err) {
        logger.error(`Error handling select menu ${customId}: ${err}`);
        if (!select.replied && !select.deferred) {
          await select.reply({ content: 'Ocurrió un error.', ephemeral: true }).catch(() => {});
        }
      }
    }

    // ─── Modal Submit Interactions ───────────────────────
    if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      const customId = modal.customId;

      try {
        if (customId.startsWith('ticket_form_')) {
          await handleTicketFormSubmit(modal);
        }
      } catch (err) {
        logger.error(`Error handling modal ${customId}: ${err}`);
        if (!modal.replied && !modal.deferred) {
          await modal.reply({ content: 'Ocurrió un error.', ephemeral: true }).catch(() => {});
        }
      }
    }
  },
};

/** Handle suggestion upvote/downvote buttons */
async function handleSuggestionVote(btn: ButtonInteraction) {
  const customId = btn.customId;
  const isUpvote = customId.startsWith('suggest_up_');
  const suggestionId = customId.replace('suggest_up_', '').replace('suggest_down_', '');

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion) {
    await btn.reply({ content: 'Sugerencia no encontrada.', ephemeral: true });
    return;
  }

  const userId = btn.user.id;
  let upvotes = [...suggestion.upvotes];
  let downvotes = [...suggestion.downvotes];

  if (isUpvote) {
    if (upvotes.includes(userId)) {
      upvotes = upvotes.filter((id) => id !== userId);
    } else {
      upvotes.push(userId);
      downvotes = downvotes.filter((id) => id !== userId);
    }
  } else {
    if (downvotes.includes(userId)) {
      downvotes = downvotes.filter((id) => id !== userId);
    } else {
      downvotes.push(userId);
      upvotes = upvotes.filter((id) => id !== userId);
    }
  }

  await prisma.suggestion.update({
    where: { id: suggestionId },
    data: { upvotes, downvotes },
  });

  // Update the embed
  try {
    const embed = EmbedBuilder.from(btn.message.embeds[0]);
    const fields = embed.data.fields || [];
    const votesFieldIdx = fields.findIndex((f) => f.name === 'Votos');
    if (votesFieldIdx >= 0) {
      fields[votesFieldIdx].value = `👍 ${upvotes.length} | 👎 ${downvotes.length}`;
    }
    embed.setFields(fields);
    await btn.message.edit({ embeds: [embed] });
  } catch {
    // ignore edit failure
  }

  await btn.reply({
    content: isUpvote ? '👍 Voto registrado!' : '👎 Voto registrado!',
    ephemeral: true,
  });
}
