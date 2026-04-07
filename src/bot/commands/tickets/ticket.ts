import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType,
  AttachmentBuilder,
  StringSelectMenuBuilder,
  GuildMember,
} from 'discord.js';
import prisma from '../../../database/client';
import { getGuildConfig, updateGuildConfig, moduleColor } from '../../utils';
import {
  generateTranscript,
  fetchChannelMessages,
  getTicketActionRow,
  getClosedActionRow,
} from '../../modules/tickets/ticketManager';

const TICKET_COLOR = 0x5865f2;
const CLOSE_COLOR = 0xed4245;
const SUCCESS_COLOR = 0x57f287;
const INFO_COLOR = 0x3498db;

function padNum(n: number) { return n.toString().padStart(4, '0'); }

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Comandos del sistema de tickets')

    // ── Panel Management ──────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Crear/enviar un panel de tickets a un canal')
        .addStringOption((opt) => opt.setName('titulo').setDescription('Titulo del panel'))
        .addStringOption((opt) => opt.setName('descripcion').setDescription('Descripcion del panel'))
        .addStringOption((opt) => opt.setName('texto_boton').setDescription('Texto del boton'))
        .addStringOption((opt) => opt.setName('emoji_boton').setDescription('Emoji del boton'))
        .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde enviar el panel'))
        .addChannelOption((opt) => opt.setName('categoria').setDescription('Categoria para tickets nuevos'))
        .addRoleOption((opt) => opt.setName('rol_staff').setDescription('Rol del staff con acceso al ticket'))
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nombre interno del panel (para varios paneles)'))
    )

    // ── Close ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('cerrar')
        .setDescription('Cerrar el ticket actual')
        .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo del cierre').setRequired(true))
    )

    // ── Close Request ─────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('solicitar-cierre')
        .setDescription('Enviar una solicitud de cierre al creador del ticket')
        .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo de la solicitud de cierre'))
    )

    // ── Reopen ────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('reabrir').setDescription('Reabrir un ticket cerrado')
    )

    // ── Delete ────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('eliminar').setDescription('Eliminar el canal del ticket actual')
    )

    // ── Transcript ────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('transcripcion').setDescription('Generar una transcripcion HTML de este ticket')
    )

    // ── Add user ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('agregar')
        .setDescription('Agregar un usuario al ticket actual')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a agregar').setRequired(true))
    )

    // ── Remove user ───────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('quitar')
        .setDescription('Quitar un usuario del ticket actual')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a quitar').setRequired(true))
    )

    // ── Claim ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('asignar').setDescription('Asignarte este ticket como staff')
    )

    // ── Unclaim ───────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('desasignar').setDescription('Liberar tu asignacion de este ticket')
    )

    // ── Rename ────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('renombrar')
        .setDescription('Renombrar el canal del ticket actual')
        .addStringOption((opt) => opt.setName('nombre').setDescription('Nuevo nombre del canal').setRequired(true))
    )

    // ── Priority ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('prioridad')
        .setDescription('Definir prioridad del ticket')
        .addStringOption((opt) =>
          opt
            .setName('nivel')
            .setDescription('Nivel de prioridad')
            .setRequired(true)
            .addChoices(
              { name: 'Baja', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'Alta', value: 'high' },
              { name: 'Urgente', value: 'urgent' }
            )
        )
    )

    // ── Escalate ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('escalar')
        .setDescription('Escalar este ticket a otro panel/equipo')
        .addStringOption((opt) => opt.setName('nombre_panel').setDescription('Nombre del panel destino').setRequired(true))
    )

    // ── New (command-style creation) ──────────────
    .addSubcommand((sub) =>
      sub
        .setName('nuevo')
        .setDescription('Crear un ticket nuevo por comando')
        .addStringOption((opt) => opt.setName('tema').setDescription('Tema/motivo del ticket'))
    )

    // ── Hub Store Panel ───────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('hubstore')
        .setDescription('Crear el panel de Hub Store con botones de Mediación, Soporte, Verificación OOC y Estafas')
        .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde enviar el panel').addChannelTypes(ChannelType.GuildText))
        .addChannelOption((opt) => opt.setName('canal_transcripcion').setDescription('Canal de Tickets Transcripcion').addChannelTypes(ChannelType.GuildText))
        .addChannelOption((opt) => opt.setName('categoria_mediacion').setDescription('Categoría Tickets Mediacion').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_soporte').setDescription('Categoría Tickets Soporte').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_verificacion').setDescription('Categoría Tickets Verificacion').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_estafas').setDescription('Categoría Tickets Estafas').addChannelTypes(ChannelType.GuildCategory))
        .addRoleOption((opt) => opt.setName('rol_staff').setDescription('Rol del staff con acceso a los tickets'))
    )

    // ── Vapiano Panel ─────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('vapiano')
        .setDescription('Crear el panel de Vapiano con botones de Mediación, Soporte, Verificación OOC y Estafas')
        .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde enviar el panel').addChannelTypes(ChannelType.GuildText))
        .addChannelOption((opt) => opt.setName('canal_transcripcion').setDescription('Canal de Tickets Transcripcion').addChannelTypes(ChannelType.GuildText))
        .addChannelOption((opt) => opt.setName('categoria_mediacion').setDescription('Categoría Tickets Mediacion').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_soporte').setDescription('Categoría Tickets Soporte').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_verificacion').setDescription('Categoría Tickets Verificacion').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption((opt) => opt.setName('categoria_estafas').setDescription('Categoría Tickets Estafas').addChannelTypes(ChannelType.GuildCategory))
        .addRoleOption((opt) => opt.setName('rol_staff').setDescription('Rol del staff con acceso a los tickets'))
    ),

  module: 'tickets',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      // ══════════════════════════════════════════════════════════
      // PANEL — Create and send a ticket panel
      // ══════════════════════════════════════════════════════════
      case 'panel': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Necesitas el permiso de **Gestionar servidor**.', flags: 64 });
          return;
        }

        const title = interaction.options.getString('titulo') || 'Tickets de soporte';
        const description = interaction.options.getString('descripcion') || 'Haz clic en el botón de abajo para crear un ticket de soporte.\nUn miembro del staff te ayudará en breve.';
        const buttonLabel = interaction.options.getString('texto_boton') || 'Crear ticket';
        const buttonEmoji = interaction.options.getString('emoji_boton') || '🎫';
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const category = interaction.options.getChannel('categoria');
        const staffRole = interaction.options.getRole('rol_staff');
        const panelName = interaction.options.getString('nombre') || title;

        const panel = await prisma.ticketPanel.create({
          data: {
            guildId,
            name: panelName,
            channelId: (targetChannel as TextChannel).id,
            title,
            description,
            buttonLabel,
            buttonEmoji,
            categoryId: category?.id || null,
            staffRoleIds: staffRole ? [staffRole.id] : [],
          },
        });

        const embed = new EmbedBuilder()
          .setColor(parseInt((panel.embedColor || '#5865F2').replace('#', ''), 16))
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: panel.footerText || 'Vapiano Bot | Sistema de tickets' })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_create_${panel.id}`)
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(buttonEmoji)
        );

        const channel = targetChannel as TextChannel;
        const msg = await channel.send({ embeds: [embed], components: [row] });

        await prisma.ticketPanel.update({
          where: { id: panel.id },
          data: { messageId: msg.id },
        });

        await interaction.reply({
          content: `Panel de tickets **${panelName}** creado en <#${channel.id}>.`,
          flags: 64,
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // CLOSE — Close the current ticket
      // ══════════════════════════════════════════════════════════
      case 'cerrar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un canal de ticket abierto.', flags: 64 });
          return;
        }

        const reason = interaction.options.getString('motivo', true);
        const panel = ticket.panel;
        const config = await getGuildConfig(guildId);

        await interaction.deferReply();

        // Generate transcript
        let transcriptResult: any = null;
        if (panel?.transcriptEnabled !== false) {
          try {
            transcriptResult = await generateTranscript(
              interaction.channel as TextChannel,
              ticket,
              interaction.user.id
            );
          } catch {}
        }

        // Update ticket
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'closed', closedAt: new Date(), closedBy: interaction.user.id, closeReason: reason },
        });

        const channel = interaction.channel as TextChannel;

        // Remove user access
        await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false, SendMessages: false }).catch(() => {});
        if (ticket.addedUsers?.length > 0) {
          for (const uid of ticket.addedUsers as string[]) {
            await channel.permissionOverwrites.edit(uid, { ViewChannel: false, SendMessages: false }).catch(() => {});
          }
        }

        await channel.setName(`cerrado-${padNum(ticket.number)}`).catch(() => {});
        if (panel?.closedCategoryId) {
          await channel.setParent(panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
        }

        const openDurationMs = Date.now() - new Date(ticket.createdAt).getTime();
        const openHours = Math.floor(openDurationMs / 3600000);
        const openMins = Math.floor((openDurationMs % 3600000) / 60000);
        const openDurationStr = openHours > 0 ? `${openHours}h ${openMins}m` : `${openMins}m`;

        const closedEmbed = new EmbedBuilder()
          .setColor(CLOSE_COLOR)
          .setTitle('Ticket cerrado')
          .setDescription(
            `Cerrado por <@${interaction.user.id}>.\n**Motivo:** ${reason}\n**Tiempo abierto:** ${openDurationStr}` +
            (transcriptResult ? `\n\nTranscripción guardada (${transcriptResult.messages.length} mensajes).` : '')
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [closedEmbed], components: [getClosedActionRow()] });

        // DM reason to user (no transcript)
        try {
          const ticketUser = await interaction.client.users.fetch(ticket.userId);
          await ticketUser.send({
            embeds: [
              new EmbedBuilder()
                .setColor(CLOSE_COLOR)
                .setTitle('Tu ticket fue cerrado')
                .setDescription(`Tu ticket **#${padNum(ticket.number)}** en **${interaction.guild!.name}** fue cerrado.`)
                .addFields({ name: 'Motivo', value: reason })
                .setTimestamp(),
            ],
          });
        } catch {}

        // Transcript to transcript channel only
        if (transcriptResult) {
          const transcriptChannelId = panel?.transcriptChannelId || config.ticketTranscriptChannelId;
          if (transcriptChannelId) {
            const tCh = interaction.guild!.channels.cache.get(transcriptChannelId) as TextChannel;
            if (tCh) {
              const buf = Buffer.from(transcriptResult.html, 'utf-8');
              await tCh.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(INFO_COLOR)
                    .setTitle(`Transcripción: Ticket #${padNum(ticket.number)}`)
                    .addFields(
                      { name: 'Creado por', value: `<@${ticket.userId}>`, inline: true },
                      { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
                      { name: 'Motivo', value: reason, inline: true },
                      { name: 'Mensajes', value: `${transcriptResult.messages.length}`, inline: true }
                    )
                    .setTimestamp(),
                ],
                files: [new AttachmentBuilder(buf, { name: `transcript-${padNum(ticket.number)}.html` })],
              }).catch(() => {});
            }
          }
        }

        // Log
        const logChannelId = panel?.logChannelId || config.ticketLogChannelId;
        if (logChannelId) {
          const logCh = interaction.guild!.channels.cache.get(logChannelId) as TextChannel;
          if (logCh) {
            await logCh.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(CLOSE_COLOR)
                  .setTitle('Ticket cerrado')
                  .addFields(
                    { name: 'Ticket', value: `#${padNum(ticket.number)}`, inline: true },
                    { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Motivo', value: reason, inline: true }
                  )
                  .setTimestamp(),
              ],
            }).catch(() => {});
          }
        }
        break;
      }

      // ══════════════════════════════════════════════════════════
      // CLOSE-REQUEST — Ask confirmation
      // ══════════════════════════════════════════════════════════
      case 'solicitar-cierre': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un ticket abierto.', flags: 64 });
          return;
        }

        const reason = interaction.options.getString('motivo');

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('Solicitud de cierre')
          .setDescription(
            `<@${interaction.user.id}> solicitó cerrar este ticket.` +
            (reason ? `\n**Motivo:** ${reason}` : '') +
            `\n\nHaz clic en el botón de abajo para confirmar o cancelar.`
          )
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_confirm_close_${interaction.user.id}`)
            .setLabel('Cerrar ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('Mantener abierto')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // REOPEN
      // ══════════════════════════════════════════════════════════
      case 'reabrir': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'closed') {
          await interaction.reply({ content: 'Este ticket no está cerrado.', flags: 64 });
          return;
        }

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'open', closedAt: null, closedBy: null, closeReason: null },
        });

        const channel = interaction.channel as TextChannel;
        await channel.permissionOverwrites.edit(ticket.userId, {
          ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
        }).catch(() => {});

        if (ticket.addedUsers?.length > 0) {
          for (const uid of ticket.addedUsers as string[]) {
            await channel.permissionOverwrites.edit(uid, {
              ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
            }).catch(() => {});
          }
        }

        const panel = ticket.panel;
        const namingPattern = panel?.namingPattern || 'ticket-{number}';
        await channel.setName(
          namingPattern.replace('{number}', padNum(ticket.number)).replace('{username}', 'user').slice(0, 100)
        ).catch(() => {});

        if (panel?.categoryId) {
          await channel.setParent(panel.categoryId, { lockPermissions: false }).catch(() => {});
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SUCCESS_COLOR)
              .setTitle('Ticket reabierto')
              .setDescription(`Reabierto por <@${interaction.user.id}>.`)
              .setTimestamp(),
          ],
          components: [getTicketActionRow(panel)],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // DELETE
      // ══════════════════════════════════════════════════════════
      case 'eliminar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'Este no es un canal de ticket.', flags: 64 });
          return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          await interaction.reply({ content: 'Necesitas el permiso de **Gestionar canales** para eliminar tickets.', flags: 64 });
          return;
        }

        // Generate transcript before deletion if not already saved
        const existingTranscript = await prisma.ticketTranscript.findFirst({
          where: { ticketId: ticket.id },
        });

        if (!existingTranscript) {
          try {
            await generateTranscript(interaction.channel as TextChannel, ticket, interaction.user.id);
          } catch {}
        }

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'deleted' },
        });

        await interaction.reply({ content: 'Este ticket se eliminara en 5 segundos...' });
        setTimeout(async () => {
          try {
            const ch = interaction.guild!.channels.cache.get(ticket.channelId);
            if (ch) await ch.delete('Ticket eliminado');
          } catch {}
        }, 5000);
        break;
      }

      // ══════════════════════════════════════════════════════════
      // TRANSCRIPT
      // ══════════════════════════════════════════════════════════
      case 'transcripcion': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'Este no es un canal de ticket.', flags: 64 });
          return;
        }

        await interaction.deferReply({ flags: 64 });

        const { html, messages } = await generateTranscript(
          interaction.channel as TextChannel,
          ticket,
          interaction.user.id
        );

        const buf = Buffer.from(html, 'utf-8');
        const attachment = new AttachmentBuilder(buf, {
          name: `transcript-${padNum(ticket.number)}.html`,
        });

        await interaction.editReply({
          content: `Transcripción generada: **${messages.length} mensajes**. Abre el archivo HTML en tu navegador.`,
          files: [attachment],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // ADD USER
      // ══════════════════════════════════════════════════════════
      case 'agregar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un ticket abierto.', flags: 64 });
          return;
        }

        const user = interaction.options.getUser('usuario', true);
        const channel = interaction.channel as TextChannel;

        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
        });

        // Track added users
        const addedUsers = [...(ticket.addedUsers || [])];
        if (!addedUsers.includes(user.id)) {
          addedUsers.push(user.id);
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { addedUsers },
          });
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(SUCCESS_COLOR)
              .setDescription(`<@${user.id}> fue agregado a este ticket.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // REMOVE USER
      // ══════════════════════════════════════════════════════════
      case 'quitar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'Este no es un canal de ticket.', flags: 64 });
          return;
        }

        const user = interaction.options.getUser('usuario', true);
        const channel = interaction.channel as TextChannel;

        await channel.permissionOverwrites.delete(user.id);

        // Remove from tracked users
        const addedUsers = (ticket.addedUsers || []).filter((id: string) => id !== user.id);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { addedUsers },
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(CLOSE_COLOR)
              .setDescription(`<@${user.id}> fue quitado de este ticket.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // CLAIM
      // ══════════════════════════════════════════════════════════
      case 'asignar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un ticket abierto.', flags: 64 });
          return;
        }

        if (ticket.claimedBy) {
          await interaction.reply({
            content: `Este ticket ya está asignado a <@${ticket.claimedBy}>.`,
            flags: 64,
          });
          return;
        }

        // Only staff can claim tickets
        const member = interaction.member as GuildMember;
        const config = await getGuildConfig(guildId);
        const staffRoleIds = ticket.panel && ticket.panel.staffRoleIds.length > 0
          ? ticket.panel.staffRoleIds
          : (config.ticketStaffRoleIds as string[] || []);
        const isStaff = staffRoleIds.some((id: string) => member.roles.cache.has(id)) ||
          (ticket.panel?.adminRoleIds as string[] | undefined)?.some((id: string) => member.roles.cache.has(id)) ||
          interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

        if (!isStaff) {
          await interaction.reply({ content: 'Solo el staff puede asignarse tickets.', flags: 64 });
          return;
        }

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { claimedBy: interaction.user.id },
        });

        // Lock others if configured
        if (ticket.panel?.claimLockOthers) {
          const channel = interaction.channel as TextChannel;
          for (const roleId of ticket.panel.staffRoleIds) {
            await channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(() => {});
          }
          await channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
          }).catch(() => {});
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(INFO_COLOR)
              .setDescription(`Este ticket fue asignado a <@${interaction.user.id}>.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // UNCLAIM
      // ══════════════════════════════════════════════════════════
      case 'desasignar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un ticket abierto.', flags: 64 });
          return;
        }

        if (!ticket.claimedBy) {
          await interaction.reply({ content: 'Este ticket no está asignado.', flags: 64 });
          return;
        }

        if (ticket.claimedBy !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Solo puedes desasignar tickets que tú asignaste o tener el permiso de Gestionar servidor.', flags: 64 });
          return;
        }

        // Restore staff permissions if they were locked
        if (ticket.panel?.claimLockOthers) {
          const channel = interaction.channel as TextChannel;
          for (const roleId of ticket.panel.staffRoleIds) {
            await channel.permissionOverwrites.edit(roleId, {
              ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
            }).catch(() => {});
          }
        }

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { claimedBy: null },
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(INFO_COLOR)
              .setDescription(`Este ticket ya no está asignado.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // RENAME
      // ══════════════════════════════════════════════════════════
      case 'renombrar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'Este no es un canal de ticket.', flags: 64 });
          return;
        }

        const newName = interaction.options.getString('nombre', true).slice(0, 100);
        const channel = interaction.channel as TextChannel;

        await channel.setName(newName);

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(INFO_COLOR)
              .setDescription(`Canal del ticket renombrado a **${newName}**.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // PRIORITY
      // ══════════════════════════════════════════════════════════
      case 'prioridad': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'Este no es un canal de ticket.', flags: 64 });
          return;
        }

        const level = interaction.options.getString('nivel', true);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { priority: level },
        });

        const priorityColors: Record<string, number> = {
          low: 0x99aab5,
          normal: TICKET_COLOR,
          high: 0xf47b67,
          urgent: 0xed4245,
        };
        const priorityEmojis: Record<string, string> = {
          low: '🟢', normal: '🔵', high: '🟠', urgent: '🔴',
        };

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(priorityColors[level] || TICKET_COLOR)
              .setDescription(`${priorityEmojis[level]} Prioridad del ticket definida en **${level.toUpperCase()}**.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // ESCALATE
      // ══════════════════════════════════════════════════════════
      case 'escalar': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'Este no es un ticket abierto.', flags: 64 });
          return;
        }

        const panelName = interaction.options.getString('nombre_panel', true);
        const targetPanel = await prisma.ticketPanel.findFirst({
          where: { guildId, name: { equals: panelName, mode: 'insensitive' } },
        });

        if (!targetPanel) {
          await interaction.reply({
            content: `No se encontró el panel "${panelName}".`,
            flags: 64,
          });
          return;
        }

        if (targetPanel.id === ticket.panelId) {
          await interaction.reply({ content: 'El ticket ya está en este panel.', flags: 64 });
          return;
        }

        // Update ticket panel
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { panelId: targetPanel.id },
        });

        // Update channel permissions with new staff roles
        const channel = interaction.channel as TextChannel;
        // Remove old staff roles
        if (ticket.panel?.staffRoleIds) {
          for (const roleId of ticket.panel.staffRoleIds) {
            await channel.permissionOverwrites.delete(roleId).catch(() => {});
          }
        }
        // Add new staff roles
        for (const roleId of targetPanel.staffRoleIds) {
          await channel.permissionOverwrites.edit(roleId, {
            ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
          }).catch(() => {});
        }

        // Move to new category if different
        if (targetPanel.categoryId && targetPanel.categoryId !== ticket.panel?.categoryId) {
          await channel.setParent(targetPanel.categoryId, { lockPermissions: false }).catch(() => {});
        }

        // Mention new staff
        const mentions = targetPanel.staffRoleIds.map((id: string) => `<@&${id}>`).join(' ');

        await interaction.reply({
          content: mentions || undefined,
          embeds: [
            new EmbedBuilder()
              .setColor(0xf47b67)
              .setTitle('Ticket escalado')
              .setDescription(
                `Este ticket fue escalado a **${targetPanel.name || targetPanel.title}** por <@${interaction.user.id}>.`
              )
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // NEW — Command-style ticket creation
      // ══════════════════════════════════════════════════════════
      case 'nuevo': {
        const topic = interaction.options.getString('tema');

        // Find default panel for this guild
        const panels = await prisma.ticketPanel.findMany({
          where: { guildId },
          orderBy: { createdAt: 'asc' },
        });

        if (panels.length === 0) {
          await interaction.reply({
            content: 'No hay paneles de tickets configurados. Un admin debe crear uno primero con `/ticket panel`.',
            flags: 64,
          });
          return;
        }

        // If only one panel, use it; otherwise show dropdown
        if (panels.length === 1) {
          const panel = panels[0];
          const openCount = await prisma.ticket.count({
            where: { guildId, userId: interaction.user.id, panelId: panel.id, status: 'open' },
          });
          if (openCount >= (panel.ticketLimit || 1)) {
            const existing = await prisma.ticket.findFirst({
              where: { guildId, userId: interaction.user.id, panelId: panel.id, status: 'open' },
            });
            await interaction.reply({
              content: `Ya tienes un ticket abierto.${existing ? ` <#${existing.channelId}>` : ''}`,
              flags: 64,
            });
            return;
          }

          await interaction.deferReply({ flags: 64 });

          const config = await getGuildConfig(guildId);
          const ticketNumber = (config.ticketCounter || 0) + 1;
          await updateGuildConfig(guildId, { ticketCounter: ticketNumber });

          const categoryId = panel.categoryId || config.ticketCategoryId;
          const staffRoleIds = panel.staffRoleIds.length > 0 ? panel.staffRoleIds : config.ticketStaffRoleIds || [];
          const namingPattern = panel.namingPattern || 'ticket-{number}';
          const channelName = namingPattern
            .replace('{number}', padNum(ticketNumber))
            .replace('{username}', interaction.user.username.slice(0, 20))
            .replace('{userid}', interaction.user.id)
            .slice(0, 100);

          const permissionOverwrites: any[] = [
            { id: guildId, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
            },
          ];
          if (interaction.guild!.members.me) {
            permissionOverwrites.push({
              id: interaction.guild!.members.me.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
            });
          }
          for (const roleId of staffRoleIds) {
            permissionOverwrites.push({
              id: roleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
            });
          }

          const channel = await interaction.guild!.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId || undefined,
            permissionOverwrites,
            topic: `Ticket #${ticketNumber} | ${interaction.user.username}${topic ? ` | ${topic}` : ''}`,
          });

          await prisma.ticket.create({
            data: {
              guildId,
              panelId: panel.id,
              channelId: channel.id,
              userId: interaction.user.id,
              number: ticketNumber,
              status: 'open',
              topic: topic || null,
            },
          });

          const welcomeEmbed = new EmbedBuilder()
            .setColor(parseInt((panel.welcomeColor || '#5865F2').replace('#', ''), 16))
            .setTitle(panel.welcomeTitle || `Ticket #${padNum(ticketNumber)}`)
            .setDescription(
              (panel.welcomeMessage || 'Bienvenido. Describe tu problema, por favor.')
                .replace('{user}', `<@${interaction.user.id}>`)
                .replace('{number}', padNum(ticketNumber))
            )
            .setTimestamp();

          if (topic) {
            welcomeEmbed.addFields({ name: 'Tema', value: topic });
          }

          const mentionParts: string[] = [];
          if (panel.mentionCreator !== false) mentionParts.push(`<@${interaction.user.id}>`);
          if (panel.mentionStaff !== false) staffRoleIds.forEach((id: string) => mentionParts.push(`<@&${id}>`));

          await channel.send({
            content: mentionParts.join(' ') || undefined,
            embeds: [welcomeEmbed],
            components: [getTicketActionRow(panel)],
          });

          await interaction.editReply({ content: `Ticket creado: <#${channel.id}>` });
        } else {
          // Multiple panels — show dropdown
          const select = new StringSelectMenuBuilder()
            .setCustomId('ticket_panel_select')
            .setPlaceholder('Selecciona una categoria de ticket...')
            .addOptions(
              panels.map((p) => ({
                label: p.name || p.title,
                description: p.description?.slice(0, 100) || 'Crear un ticket',
                value: p.id,
                emoji: p.buttonEmoji || '🎫',
              }))
            );

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
          await interaction.reply({
            content: 'Selecciona una categoria de ticket:',
            components: [row],
            flags: 64,
          });
        }
        break;
      }

      // ══════════════════════════════════════════════════════════
      // HUBSTORE — Panel de Hub Store con 4 tipos de ticket
      // ══════════════════════════════════════════════════════════
      case 'hubstore':
      // ══════════════════════════════════════════════════════════
      // VAPIANO — Panel de Vapiano con 4 tipos de ticket
      // ══════════════════════════════════════════════════════════
      case 'vapiano': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Necesitas el permiso de **Gestionar servidor**.', flags: 64 });
          return;
        }

        const isHubStore = sub === 'hubstore';
        const prefix = isHubStore ? 'hubstore' : 'vapiano';
        const panelTitle = isHubStore ? 'Hub Store' : 'Vapiano';

        const targetChannel = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;
        const transcriptChannel = interaction.options.getChannel('canal_transcripcion');
        const catMediacion    = interaction.options.getChannel('categoria_mediacion');
        const catSoporte      = interaction.options.getChannel('categoria_soporte');
        const catVerificacion = interaction.options.getChannel('categoria_verificacion');
        const catEstafas      = interaction.options.getChannel('categoria_estafas');
        const staffRole = interaction.options.getRole('rol_staff');
        const staffRoleIds = staffRole ? [staffRole.id] : [];

        const hubTypes = [
          { name: 'mediacion',        label: 'Mediación',        emoji: '🤝', style: ButtonStyle.Primary,   title: 'Mediación',        categoryId: catMediacion?.id    || null },
          { name: 'soporte',          label: 'Soporte',          emoji: '🔧', style: ButtonStyle.Secondary, title: 'Soporte',          categoryId: catSoporte?.id      || null },
          { name: 'verificacion-ooc', label: 'Verificación OOC', emoji: '💰', style: ButtonStyle.Success,   title: 'Verificación OOC', categoryId: catVerificacion?.id || null },
          { name: 'estafas',          label: 'Estafas',          emoji: '🚨', style: ButtonStyle.Danger,    title: 'Estafas',          categoryId: catEstafas?.id      || null },
        ];

        // Create one TicketPanel per type
        const panels = await Promise.all(
          hubTypes.map((t) =>
            prisma.ticketPanel.create({
              data: {
                guildId,
                name: `${prefix}-${t.name}`,
                channelId: targetChannel.id,
                title: t.title,
                description: t.title,
                buttonLabel: t.label,
                buttonEmoji: t.emoji,
                categoryId: t.categoryId,
                staffRoleIds,
                transcriptChannelId: transcriptChannel?.id || null,
              },
            })
          )
        );

        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle('SELECCIONAR EL BOTÓN QUE CORRESPONDA A TU CASO')
          .setDescription(
            '🤝 **Mediación** – Un miembro del staff actuará como intermediario para que tu compra o venta sea segura.\n\n' +
            '🔧 **Soporte** – Para dudas o problemas con el marketplace.\n\n' +
            '💰 **Verificación OOC** – Solicitar rango para poder hacer ventas OOC.\n\n' +
            '🚨 **Estafas** – Reporta intentos o si ya fuiste estafado.'
          );

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          hubTypes.map((t, i) =>
            new ButtonBuilder()
              .setCustomId(`ticket_create_${panels[i].id}`)
              .setLabel(t.label)
              .setStyle(t.style)
              .setEmoji(t.emoji)
          )
        );

        const msg = await targetChannel.send({ embeds: [embed], components: [row] });

        await Promise.all(
          panels.map((p) =>
            prisma.ticketPanel.update({ where: { id: p.id }, data: { messageId: msg.id } })
          )
        );

        await interaction.reply({
          content: `Panel **${panelTitle}** creado en <#${targetChannel.id}> con 4 tipos de ticket.`,
          flags: 64,
        });
        break;
      }
    }
  },
};
