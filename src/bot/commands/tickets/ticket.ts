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
    .setDescription('Ticket system commands')

    // ── Panel Management ──────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Create/send a ticket panel to a channel')
        .addStringOption((opt) => opt.setName('title').setDescription('Panel title'))
        .addStringOption((opt) => opt.setName('description').setDescription('Panel description'))
        .addStringOption((opt) => opt.setName('button_label').setDescription('Button text'))
        .addStringOption((opt) => opt.setName('button_emoji').setDescription('Button emoji'))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to send the panel to'))
        .addChannelOption((opt) => opt.setName('category').setDescription('Category for new tickets'))
        .addRoleOption((opt) => opt.setName('staff_role').setDescription('Staff role for ticket access'))
        .addStringOption((opt) => opt.setName('name').setDescription('Internal panel name (for managing multiple panels)'))
    )

    // ── Close ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for closing'))
    )

    // ── Close Request ─────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('close-request')
        .setDescription('Send a close request to the ticket creator')
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the close request'))
    )

    // ── Reopen ────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('reopen').setDescription('Reopen a closed ticket')
    )

    // ── Delete ────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('delete').setDescription('Delete the current ticket channel')
    )

    // ── Transcript ────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('transcript').setDescription('Generate an HTML transcript of this ticket')
    )

    // ── Add user ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a user to the current ticket')
        .addUserOption((opt) => opt.setName('user').setDescription('User to add').setRequired(true))
    )

    // ── Remove user ───────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the current ticket')
        .addUserOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true))
    )

    // ── Claim ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Claim this ticket as a staff member')
    )

    // ── Unclaim ───────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('unclaim').setDescription('Release your claim on this ticket')
    )

    // ── Rename ────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('rename')
        .setDescription('Rename the current ticket channel')
        .addStringOption((opt) => opt.setName('name').setDescription('New channel name').setRequired(true))
    )

    // ── Priority ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('priority')
        .setDescription('Set ticket priority')
        .addStringOption((opt) =>
          opt
            .setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )
        )
    )

    // ── Escalate ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('escalate')
        .setDescription('Escalate this ticket to another panel/team')
        .addStringOption((opt) => opt.setName('panel_name').setDescription('Target panel name').setRequired(true))
    )

    // ── New (command-style creation) ──────────────
    .addSubcommand((sub) =>
      sub
        .setName('new')
        .setDescription('Create a new ticket via command')
        .addStringOption((opt) => opt.setName('topic').setDescription('Ticket topic/reason'))
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
          await interaction.reply({ content: 'You need **Manage Server** permission.', ephemeral: true });
          return;
        }

        const title = interaction.options.getString('title') || 'Support Tickets';
        const description = interaction.options.getString('description') || 'Click the button below to create a support ticket.\nA staff member will assist you shortly.';
        const buttonLabel = interaction.options.getString('button_label') || 'Create Ticket';
        const buttonEmoji = interaction.options.getString('button_emoji') || '🎫';
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const category = interaction.options.getChannel('category');
        const staffRole = interaction.options.getRole('staff_role');
        const panelName = interaction.options.getString('name') || title;

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
          .setFooter({ text: panel.footerText || 'Vapiano Bot | Ticket System' })
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
          content: `Ticket panel **${panelName}** created in <#${channel.id}>. Configure advanced settings via the dashboard.`,
          ephemeral: true,
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // CLOSE — Close the current ticket
      // ══════════════════════════════════════════════════════════
      case 'close': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
          return;
        }

        const reason = interaction.options.getString('reason');
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
          } catch (err) {
            // continue without transcript
          }
        }

        // Update ticket
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'closed',
            closedAt: new Date(),
            closedBy: interaction.user.id,
            closeReason: reason || null,
          },
        });

        const channel = interaction.channel as TextChannel;

        // Remove user access
        await channel.permissionOverwrites.edit(ticket.userId, {
          ViewChannel: false, SendMessages: false,
        }).catch(() => {});

        if (ticket.addedUsers?.length > 0) {
          for (const uid of ticket.addedUsers as string[]) {
            await channel.permissionOverwrites.edit(uid, {
              ViewChannel: false, SendMessages: false,
            }).catch(() => {});
          }
        }

        await channel.setName(`closed-${padNum(ticket.number)}`).catch(() => {});

        if (panel?.closedCategoryId) {
          await channel.setParent(panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
        }

        const closedEmbed = new EmbedBuilder()
          .setColor(CLOSE_COLOR)
          .setTitle('Ticket Closed')
          .setDescription(
            `Closed by <@${interaction.user.id}>.` +
            (reason ? `\n**Reason:** ${reason}` : '') +
            (transcriptResult ? `\n\nTranscript saved (${transcriptResult.messages.length} messages).` : '')
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [closedEmbed], components: [getClosedActionRow()] });

        // Send transcript to channel + DM
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
                    .setTitle(`Transcript: Ticket #${padNum(ticket.number)}`)
                    .addFields(
                      { name: 'Created By', value: `<@${ticket.userId}>`, inline: true },
                      { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                      { name: 'Messages', value: `${transcriptResult.messages.length}`, inline: true }
                    )
                    .setTimestamp(),
                ],
                files: [new AttachmentBuilder(buf, { name: `transcript-${padNum(ticket.number)}.html` })],
              }).catch(() => {});
            }
          }

          // DM user
          if (panel?.transcriptDMUser !== false || config.ticketDMTranscript) {
            try {
              const user = await interaction.client.users.fetch(ticket.userId);
              const buf = Buffer.from(transcriptResult.html, 'utf-8');
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(INFO_COLOR)
                    .setTitle('Ticket Closed')
                    .setDescription(`Your ticket #${padNum(ticket.number)} in **${interaction.guild!.name}** has been closed.`)
                    .setTimestamp(),
                ],
                files: [new AttachmentBuilder(buf, { name: `transcript-${padNum(ticket.number)}.html` })],
              });
            } catch {}
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
                  .setTitle('Ticket Closed')
                  .addFields(
                    { name: 'Ticket', value: `#${padNum(ticket.number)}`, inline: true },
                    { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason || 'No reason', inline: true }
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
      case 'close-request': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
          return;
        }

        const reason = interaction.options.getString('reason');

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle('Close Request')
          .setDescription(
            `<@${interaction.user.id}> has requested to close this ticket.` +
            (reason ? `\n**Reason:** ${reason}` : '') +
            `\n\nClick the button below to confirm or cancel.`
          )
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_confirm_close_${interaction.user.id}`)
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('Keep Open')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // REOPEN
      // ══════════════════════════════════════════════════════════
      case 'reopen': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'closed') {
          await interaction.reply({ content: 'This ticket is not closed.', ephemeral: true });
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
              .setTitle('Ticket Reopened')
              .setDescription(`Reopened by <@${interaction.user.id}>.`)
              .setTimestamp(),
          ],
          components: [getTicketActionRow(panel)],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // DELETE
      // ══════════════════════════════════════════════════════════
      case 'delete': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
          return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
          await interaction.reply({ content: 'You need **Manage Channels** permission to delete tickets.', ephemeral: true });
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

        await interaction.reply({ content: 'This ticket will be deleted in 5 seconds...' });
        setTimeout(async () => {
          try {
            const ch = interaction.guild!.channels.cache.get(ticket.channelId);
            if (ch) await ch.delete('Ticket deleted');
          } catch {}
        }, 5000);
        break;
      }

      // ══════════════════════════════════════════════════════════
      // TRANSCRIPT
      // ══════════════════════════════════════════════════════════
      case 'transcript': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

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
          content: `Transcript generated: **${messages.length} messages**. Open the HTML file in your browser.`,
          files: [attachment],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // ADD USER
      // ══════════════════════════════════════════════════════════
      case 'add': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
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
              .setDescription(`<@${user.id}> has been added to this ticket.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // REMOVE USER
      // ══════════════════════════════════════════════════════════
      case 'remove': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
          return;
        }

        const user = interaction.options.getUser('user', true);
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
              .setDescription(`<@${user.id}> has been removed from this ticket.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // CLAIM
      // ══════════════════════════════════════════════════════════
      case 'claim': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
          return;
        }

        if (ticket.claimedBy) {
          await interaction.reply({
            content: `This ticket is already claimed by <@${ticket.claimedBy}>.`,
            ephemeral: true,
          });
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
              .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // UNCLAIM
      // ══════════════════════════════════════════════════════════
      case 'unclaim': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
          return;
        }

        if (!ticket.claimedBy) {
          await interaction.reply({ content: 'This ticket is not claimed.', ephemeral: true });
          return;
        }

        if (ticket.claimedBy !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'You can only unclaim tickets you claimed, or have Manage Server permission.', ephemeral: true });
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
              .setDescription(`This ticket is no longer claimed.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // RENAME
      // ══════════════════════════════════════════════════════════
      case 'rename': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
          return;
        }

        const newName = interaction.options.getString('name', true).slice(0, 100);
        const channel = interaction.channel as TextChannel;

        await channel.setName(newName);

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(INFO_COLOR)
              .setDescription(`Ticket channel renamed to **${newName}**.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // PRIORITY
      // ══════════════════════════════════════════════════════════
      case 'priority': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
        });

        if (!ticket) {
          await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
          return;
        }

        const level = interaction.options.getString('level', true);
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
              .setDescription(`${priorityEmojis[level]} Ticket priority set to **${level.toUpperCase()}**.`)
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // ESCALATE
      // ══════════════════════════════════════════════════════════
      case 'escalate': {
        const ticket = await prisma.ticket.findUnique({
          where: { channelId: interaction.channelId },
          include: { panel: true },
        });

        if (!ticket || ticket.status !== 'open') {
          await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
          return;
        }

        const panelName = interaction.options.getString('panel_name', true);
        const targetPanel = await prisma.ticketPanel.findFirst({
          where: { guildId, name: { equals: panelName, mode: 'insensitive' } },
        });

        if (!targetPanel) {
          await interaction.reply({
            content: `Panel "${panelName}" not found. Available panels can be seen on the dashboard.`,
            ephemeral: true,
          });
          return;
        }

        if (targetPanel.id === ticket.panelId) {
          await interaction.reply({ content: 'Ticket is already on this panel.', ephemeral: true });
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
              .setTitle('Ticket Escalated')
              .setDescription(
                `This ticket has been escalated to **${targetPanel.name || targetPanel.title}** by <@${interaction.user.id}>.`
              )
              .setTimestamp(),
          ],
        });
        break;
      }

      // ══════════════════════════════════════════════════════════
      // NEW — Command-style ticket creation
      // ══════════════════════════════════════════════════════════
      case 'new': {
        const topic = interaction.options.getString('topic');

        // Find default panel for this guild
        const panels = await prisma.ticketPanel.findMany({
          where: { guildId },
          orderBy: { createdAt: 'asc' },
        });

        if (panels.length === 0) {
          await interaction.reply({
            content: 'No ticket panels configured. An admin must create one with `/ticket panel` first.',
            ephemeral: true,
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
              content: `You already have an open ticket.${existing ? ` <#${existing.channelId}>` : ''}`,
              ephemeral: true,
            });
            return;
          }

          await interaction.deferReply({ ephemeral: true });

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
              (panel.welcomeMessage || 'Welcome! Please describe your issue.')
                .replace('{user}', `<@${interaction.user.id}>`)
                .replace('{number}', padNum(ticketNumber))
            )
            .setTimestamp();

          if (topic) {
            welcomeEmbed.addFields({ name: 'Topic', value: topic });
          }

          const mentionParts: string[] = [];
          if (panel.mentionCreator !== false) mentionParts.push(`<@${interaction.user.id}>`);
          if (panel.mentionStaff !== false) staffRoleIds.forEach((id: string) => mentionParts.push(`<@&${id}>`));

          await channel.send({
            content: mentionParts.join(' ') || undefined,
            embeds: [welcomeEmbed],
            components: [getTicketActionRow(panel)],
          });

          await interaction.editReply({ content: `Ticket created: <#${channel.id}>` });
        } else {
          // Multiple panels — show dropdown
          const select = new StringSelectMenuBuilder()
            .setCustomId('ticket_panel_select')
            .setPlaceholder('Select a ticket category...')
            .addOptions(
              panels.map((p) => ({
                label: p.name || p.title,
                description: p.description?.slice(0, 100) || 'Create a ticket',
                value: p.id,
                emoji: p.buttonEmoji || '🎫',
              }))
            );

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
          await interaction.reply({
            content: 'Select a ticket category:',
            components: [row],
            ephemeral: true,
          });
        }
        break;
      }
    }
  },
};
