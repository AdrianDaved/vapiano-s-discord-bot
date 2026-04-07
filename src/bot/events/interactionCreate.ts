import {
  Events,
  Interaction,
  ButtonInteraction,
  EmbedBuilder,
  PermissionsBitField,
  Collection,
} from "discord.js";
import { BotClient } from "../../shared/types";
import logger from "../../shared/logger";
import { getGuildConfig } from "../utils";
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
} from "../modules/tickets/ticketManager";
import { handleReactionRoleButton } from "../modules/moderation/reactionRoles";
import { handlePollVote } from "../modules/automation/polls";
import { handleGiveawayButton } from "../modules/giveaway/giveawayManager";
import { handleRifaJoin, handleRifaTicket, handleRifaPanelTicket } from "../modules/rifa/rifaManager";
import { handleInterestCreate, INTEREST_BUTTON_CUSTOM_ID } from "../modules/interest/interestHandler";
import prisma from "../../database/client";
import { sendAudit } from "../modules/audit/auditLogger";


// ── Command-level permission cache (30s TTL) ─────────────────────────────────
const cmdPermCache = new Map<string, { data: any; expiresAt: number }>();
const CMD_PERM_TTL = 30_000;

async function getCmdPerm(guildId: string, command: string) {
  const key = `${guildId}:${command}`;
  const cached = cmdPermCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await prisma.commandPermission.findUnique({
    where: { guildId_command: { guildId, command } },
  });
  cmdPermCache.set(key, { data, expiresAt: Date.now() + CMD_PERM_TTL });
  return data;
}

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
      if (command.permissions?.length && interaction.memberPermissions) {
        const missing = command.permissions.filter(
          (p) => !interaction.memberPermissions!.has(p),
        );
        if (missing.length > 0) {
          await interaction.reply({
            content: "No tienes permiso para usar este comando.",
            ephemeral: true,
          });
          return;
        }
      }

      // Module enabled check + role restriction
      if (command.module && interaction.guildId) {
        const config = await getGuildConfig(interaction.guildId);
        const moduleField = `${command.module}Enabled`;
        if (config[moduleField] === false && command.module !== "config") {
          await interaction.reply({
            content: `El módulo **${command.module}** está desactivado. Actívalo con \`/configuracion modulo activar name:${command.module}\`.`,
            ephemeral: true,
          });
          return;
        }

        // Check module role restrictions (skip for admins and config module)
        if (command.module !== "config" && interaction.member) {
          const allowedRoles = (config.moduleAllowedRoles as Record<string, string[]> | null)?.[command.module] ?? [];
          if (allowedRoles.length > 0) {
            const memberRoles = (interaction.member as any).roles?.cache ?? new Map();
            const hasRole = allowedRoles.some((rid: string) => memberRoles.has(rid));
            const isAdmin = (interaction.memberPermissions as PermissionsBitField)?.has("Administrator") ?? false;
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

      // Command-level permission check (from dashboard)
      if (interaction.guildId) {
        const cmdPerm = await getCmdPerm(interaction.guildId, interaction.commandName);
        if (cmdPerm?.disabled) {
          await interaction.reply({ content: 'Este comando está desactivado en este servidor.', ephemeral: true });
          return;
        }
        if (interaction.member) {
          const memberRoles = (interaction.member as any).roles?.cache ?? new Map();
          const isAdmin = (interaction.memberPermissions as any)?.has('Administrator') ?? false;
          const allowedRoles: string[] = cmdPerm?.roleIds ?? [];
          if (allowedRoles.length > 0) {
            // Roles configurados: solo esos roles o admins
            if (!isAdmin && !allowedRoles.some((rid: string) => memberRoles.has(rid))) {
              const roleList = allowedRoles.map((id: string) => `<@&${id}>`).join(', ');
              await interaction.reply({ content: `Solo pueden usar este comando: ${roleList}`, ephemeral: true });
              return;
            }
          } else {
            // Sin roles configurados: solo administradores por defecto
            if (!isAdmin) {
              await interaction.reply({ content: 'Este comando solo puede ser usado por administradores.', ephemeral: true });
              return;
            }
          }
        }
      }

      try {
        await command.execute(interaction);

        // Audit: log command execution
        if (interaction.guildId) {
          try {
            const opts = interaction.options.data
              .map((o: any) => `${o.name}: ${o.value ?? '[subcomando]'}`)
              .join(', ');
            const { EmbedBuilder: EB } = await import('discord.js');
            const auditEmbed = new EB()
              .setColor(0x5865f2)
              .setTitle('⌨️ Comando ejecutado')
              .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
              .addFields(
                { name: '📋 Comando', value: `\`/${interaction.commandName}\``, inline: true },
                { name: '👤 Usuario',  value: `<@${interaction.user.id}>`, inline: true },
                { name: '📢 Canal',    value: `<#${interaction.channelId}>`, inline: true },
                ...(opts ? [{ name: '⚙️ Opciones', value: opts.slice(0, 1024) }] : []),
              )
              .setFooter({ text: `ID: ${interaction.user.id}` })
              .setTimestamp();
            await sendAudit(interaction.guildId, auditEmbed, client as any);
          } catch { /* ignore audit errors */ }
        }
      } catch (err) {
        logger.error(`Error executing /${command.data.name}: ${err}`);
        const reply = { content: "Ocurrió un error al ejecutar este comando.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    // ─── Button Interactions ─────────────────────────────
    if (interaction.isButton()) {
      const { customId } = interaction;

      try {
        if (customId.startsWith("ticket_create_")) await handleTicketButton(interaction);
        else if (customId === "ticket_close") await handleTicketCloseButton(interaction);
        else if (customId.startsWith("ticket_confirm_close_")) await handleTicketConfirmClose(interaction);
        else if (customId === "ticket_cancel_close") await handleTicketCancelClose(interaction);
        else if (customId === "ticket_reopen") await handleTicketReopen(interaction);
        else if (customId === "ticket_delete") await handleTicketDelete(interaction);
        else if (customId === "ticket_claim") await handleTicketClaim(interaction);
        else if (customId === "ticket_transcript") await handleTicketTranscriptButton(interaction);
        else if (customId.startsWith("ticket_feedback_")) await handleTicketFeedback(interaction);
        else if (customId.startsWith("rr_")) await handleReactionRoleButton(interaction);
        else if (customId.startsWith("poll_")) await handlePollVote(interaction);
        else if (customId === "giveaway_enter") await handleGiveawayButton(interaction);
        else if (customId.startsWith("rifa_join_")) await handleRifaJoin(interaction);
        else if (customId.startsWith("rifa_ticket_")) await handleRifaTicket(interaction);
        else if (customId.startsWith("rifa_panel_ticket_")) await handleRifaPanelTicket(interaction);
        else if (customId === INTEREST_BUTTON_CUSTOM_ID) await handleInterestCreate(interaction);
        else if (customId.startsWith("suggest_up_") || customId.startsWith("suggest_down_")) await handleSuggestionVote(interaction);
      } catch (err) {
        logger.error(`Error handling button ${customId}: ${err}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Ocurrió un error.", ephemeral: true }).catch(() => {});
        }
      }
    }

    // ─── Select Menu Interactions ────────────────────────
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === "ticket_panel_select") {
          await handleTicketDropdown(interaction);
        }
      } catch (err) {
        logger.error(`Error handling select menu ${interaction.customId}: ${err}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Ocurrió un error.", ephemeral: true }).catch(() => {});
        }
      }
    }

    // ─── Modal Submit Interactions ───────────────────────
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith("ticket_form_")) {
          await handleTicketFormSubmit(interaction);
        }
      } catch (err) {
        logger.error(`Error handling modal ${interaction.customId}: ${err}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Ocurrió un error.", ephemeral: true }).catch(() => {});
        }
      }
    }
  },
};

/** Handle suggestion upvote/downvote buttons */
async function handleSuggestionVote(btn: ButtonInteraction) {
  const { customId } = btn;
  const isUpvote = customId.startsWith("suggest_up_");
  const suggestionId = customId.replace("suggest_up_", "").replace("suggest_down_", "");

  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) {
    await btn.reply({ content: "Sugerencia no encontrada.", ephemeral: true });
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
    const votesFieldIdx = fields.findIndex((f) => f.name === "Votos");
    if (votesFieldIdx >= 0) {
      fields[votesFieldIdx].value = `👍 ${upvotes.length} | 👎 ${downvotes.length}`;
    }
    embed.setFields(fields);
    await btn.message.edit({ embeds: [embed] });
  } catch {
    // ignore edit failure
  }

  await btn.reply({
    content: isUpvote ? "👍 Voto registrado!" : "👎 Voto registrado!",
    ephemeral: true,
  });
}
