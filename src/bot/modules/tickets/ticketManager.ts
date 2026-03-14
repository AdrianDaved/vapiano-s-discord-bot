import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Message,
  GuildMember,
  User,
} from 'discord.js';
import prisma from '../../../database/client';
import { getGuildConfig, updateGuildConfig } from '../../utils';
import logger from '../../../shared/logger';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const TICKET_COLOR = 0x5865f2;
const CLOSE_COLOR = 0xed4245;
const SUCCESS_COLOR = 0x57f287;
const WARNING_COLOR = 0xfee75c;
const INFO_COLOR = 0x3498db;

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT GENERATION (HTML)
// ═══════════════════════════════════════════════════════════════

interface TranscriptMessage {
  author: string;
  authorId: string;
  avatarUrl: string | null;
  content: string;
  embeds: number;
  attachments: string[];
  timestamp: string;
  isBot: boolean;
}

/**
 * Fetch all messages in a channel (up to 1000) and return structured data.
 */
async function fetchChannelMessages(channel: TextChannel, limit = 1000): Promise<TranscriptMessage[]> {
  const allMessages: Message[] = [];
  let lastId: string | undefined;

  while (allMessages.length < limit) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {}),
    });
    if (batch.size === 0) break;
    allMessages.push(...batch.values());
    lastId = batch.lastKey();
    if (batch.size < 100) break;
  }

  return allMessages
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map((m) => ({
      author: m.author.displayName || m.author.username,
      authorId: m.author.id,
      avatarUrl: m.author.displayAvatarURL({ size: 64 }),
      content: m.content || '',
      embeds: m.embeds.length,
      attachments: m.attachments.map((a) => a.url),
      timestamp: m.createdAt.toISOString(),
      isBot: m.author.bot,
    }));
}

/**
 * Generate an HTML transcript from messages.
 */
function generateHtmlTranscript(
  messages: TranscriptMessage[],
  ticketInfo: { number: number; userId: string; guildName: string; channelName: string; createdAt: Date; closedAt?: Date | null }
): string {
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const formatContent = (content: string) => {
    let html = escapeHtml(content);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code blocks
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code
    html = html.replace(/`(.+?)`/g, '<code class="inline">$1</code>');
    // Links
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    // User mentions
    html = html.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
    // Role mentions
    html = html.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention role">@Role:$1</span>');
    // Channel mentions
    html = html.replace(/&lt;#(\d+)&gt;/g, '<span class="mention channel">#$1</span>');
    return html;
  };

  const messageHtml = messages.map((m) => {
    const time = new Date(m.timestamp);
    const timeStr = time.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' });
    const avatarSrc = m.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const attachmentsHtml = m.attachments
      .map((url) => {
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(url)) {
          return `<div class="attachment"><img src="${escapeHtml(url)}" alt="attachment" loading="lazy"></div>`;
        }
        return `<div class="attachment"><a href="${escapeHtml(url)}" target="_blank">Attachment</a></div>`;
      })
      .join('');
    const embedBadge = m.embeds > 0 ? `<span class="embed-badge">${m.embeds} embed(s)</span>` : '';
    const botBadge = m.isBot ? '<span class="bot-badge">BOT</span>' : '';

    return `
      <div class="message">
        <div class="avatar"><img src="${escapeHtml(avatarSrc)}" alt=""></div>
        <div class="msg-body">
          <div class="msg-header">
            <span class="author">${escapeHtml(m.author)}</span>
            ${botBadge}
            <span class="timestamp">${timeStr}</span>
          </div>
          ${m.content ? `<div class="content">${formatContent(m.content)}</div>` : ''}
          ${embedBadge}
          ${attachmentsHtml}
        </div>
      </div>`;
  }).join('\n');

  const createdStr = ticketInfo.createdAt.toLocaleString('en-US');
  const closedStr = ticketInfo.closedAt ? ticketInfo.closedAt.toLocaleString('en-US') : 'Still open';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript - Ticket #${ticketInfo.number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }
  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }
  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }
  .header .meta { color: #b9bbbe; font-size: 13px; }
  .header .meta span { margin-right: 16px; }
  .messages { padding: 16px; }
  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }
  .message:hover { background: #32353b; }
  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }
  .msg-body { flex: 1; min-width: 0; }
  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
  .author { color: #fff; font-weight: 600; font-size: 15px; }
  .timestamp { color: #72767d; font-size: 11px; }
  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
  .content { color: #dcddde; word-wrap: break-word; }
  .content a { color: #00aff4; text-decoration: none; }
  .content a:hover { text-decoration: underline; }
  .content strong { color: #fff; }
  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }
  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }
  .content pre code { font-size: 13px; }
  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }
  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }
  .attachment { margin: 4px 0; }
  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }
  .attachment a { color: #00aff4; }
  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <h1>Ticket #${String(ticketInfo.number).padStart(4, '0')}</h1>
    <div class="meta">
      <span>Server: ${escapeHtml(ticketInfo.guildName)}</span>
      <span>Channel: ${escapeHtml(ticketInfo.channelName)}</span>
      <span>Created: ${createdStr}</span>
      <span>Closed: ${closedStr}</span>
      <span>Messages: ${messages.length}</span>
    </div>
  </div>
  <div class="messages">
    ${messageHtml}
  </div>
  <div class="footer">
    Generated by Vapiano Bot &bull; ${new Date().toLocaleString('en-US')}
  </div>
</body>
</html>`;
}

/**
 * Generate and save a transcript for a ticket.
 */
export async function generateTranscript(
  channel: TextChannel,
  ticket: any,
  closedBy?: string
): Promise<{ html: string; messages: TranscriptMessage[]; transcriptId: string }> {
  const messages = await fetchChannelMessages(channel);
  const guildName = channel.guild.name;
  const channelName = channel.name;

  const html = generateHtmlTranscript(messages, {
    number: ticket.number,
    userId: ticket.userId,
    guildName,
    channelName,
    createdAt: ticket.createdAt,
    closedAt: ticket.closedAt || new Date(),
  });

  const transcript = await prisma.ticketTranscript.create({
    data: {
      ticketId: ticket.id,
      panelId: ticket.panelId,
      guildId: ticket.guildId,
      channelId: channel.id,
      userId: ticket.userId,
      closedBy: closedBy || null,
      messageCount: messages.length,
      messages: messages as any,
      htmlContent: html,
    },
  });

  return { html, messages, transcriptId: transcript.id };
}

// ═══════════════════════════════════════════════════════════════
// TICKET ACTION BUTTONS ROW (shown inside ticket channels)
// ═══════════════════════════════════════════════════════════════

function getTicketActionRow(panel: any): ActionRowBuilder<ButtonBuilder> {
  const buttons: ButtonBuilder[] = [];

  if (panel?.showCloseButton !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );
  }

  if (panel?.showClaimButton !== false && panel?.claimEnabled !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🙋')
    );
  }

  if (panel?.showTranscriptButton !== false && panel?.transcriptEnabled !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Transcript')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

function getClosedActionRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_reopen')
      .setLabel('Reopen')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓'),
    new ButtonBuilder()
      .setCustomId('ticket_delete')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
    new ButtonBuilder()
      .setCustomId('ticket_transcript')
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋')
  );
}

// ═══════════════════════════════════════════════════════════════
// TICKET CREATION — Button Click
// ═══════════════════════════════════════════════════════════════

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) return;

  const panelId = interaction.customId.replace('ticket_create_', '');
  const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
  if (!panel) {
    await interaction.reply({ content: 'This ticket panel no longer exists.', ephemeral: true });
    return;
  }

  // Check ticket limit per user per panel
  const openCount = await prisma.ticket.count({
    where: { guildId: interaction.guild.id, userId: interaction.user.id, panelId: panel.id, status: 'open' },
  });
  const limit = panel.ticketLimit || 1;
  if (openCount >= limit) {
    const existingTicket = await prisma.ticket.findFirst({
      where: { guildId: interaction.guild.id, userId: interaction.user.id, panelId: panel.id, status: 'open' },
    });
    await interaction.reply({
      content: `You already have ${openCount} open ticket(s) (limit: ${limit}).${existingTicket ? ` Go to <#${existingTicket.channelId}>` : ''}`,
      ephemeral: true,
    });
    return;
  }

  // If form is enabled, show modal first
  if (panel.formEnabled && panel.formQuestions) {
    const questions = panel.formQuestions as Array<{
      label: string;
      placeholder?: string;
      style?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    }>;

    if (questions.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_form_${panelId}`)
        .setTitle(panel.formTitle || 'Ticket Form');

      const rows: ActionRowBuilder<TextInputBuilder>[] = [];
      for (let i = 0; i < Math.min(questions.length, 5); i++) {
        const q = questions[i];
        const input = new TextInputBuilder()
          .setCustomId(`question_${i}`)
          .setLabel(q.label.slice(0, 45))
          .setPlaceholder(q.placeholder || '')
          .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(q.required !== false);
        if (q.minLength) input.setMinLength(q.minLength);
        if (q.maxLength) input.setMaxLength(q.maxLength);
        rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      }

      modal.addComponents(rows);
      await interaction.showModal(modal);
      return;
    }
  }

  // No form — create ticket directly
  await interaction.deferReply({ ephemeral: true });
  await createTicket(interaction, panel, null);
}

/**
 * Handle dropdown/select menu for multi-panel ticket creation.
 */
export async function handleTicketDropdown(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;

  const panelId = interaction.values[0];
  const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
  if (!panel) {
    await interaction.reply({ content: 'This ticket panel no longer exists.', ephemeral: true });
    return;
  }

  const openCount = await prisma.ticket.count({
    where: { guildId: interaction.guild.id, userId: interaction.user.id, panelId: panel.id, status: 'open' },
  });
  if (openCount >= (panel.ticketLimit || 1)) {
    await interaction.reply({ content: 'You already have the maximum open tickets for this category.', ephemeral: true });
    return;
  }

  if (panel.formEnabled && panel.formQuestions) {
    const questions = panel.formQuestions as Array<any>;
    if (questions.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_form_${panelId}`)
        .setTitle(panel.formTitle || 'Ticket Form');
      for (let i = 0; i < Math.min(questions.length, 5); i++) {
        const q = questions[i];
        const input = new TextInputBuilder()
          .setCustomId(`question_${i}`)
          .setLabel(q.label.slice(0, 45))
          .setPlaceholder(q.placeholder || '')
          .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(q.required !== false);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      }
      await interaction.showModal(modal);
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });
  await createTicket(interaction, panel, null);
}

/**
 * Handle form modal submission — creates the ticket with form answers.
 */
export async function handleTicketFormSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) return;

  const panelId = interaction.customId.replace('ticket_form_', '');
  const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
  if (!panel) {
    await interaction.reply({ content: 'Panel no longer exists.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // Collect form answers
  const questions = (panel.formQuestions || []) as Array<{ label: string }>;
  const answers: Array<{ question: string; answer: string }> = [];
  for (let i = 0; i < Math.min(questions.length, 5); i++) {
    const val = interaction.fields.getTextInputValue(`question_${i}`).trim();
    answers.push({ question: questions[i].label, answer: val });
  }

  await createTicket(interaction, panel, answers);
}

// ═══════════════════════════════════════════════════════════════
// CORE: CREATE TICKET
// ═══════════════════════════════════════════════════════════════

async function createTicket(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  panel: any,
  formAnswers: Array<{ question: string; answer: string }> | null
): Promise<void> {
  if (!interaction.guild) return;

  try {
    const config = await getGuildConfig(interaction.guild.id);
    const ticketNumber = (config.ticketCounter || 0) + 1;
    await updateGuildConfig(interaction.guild.id, { ticketCounter: ticketNumber });

    const categoryId = panel.categoryId || config.ticketCategoryId;
    const staffRoleIds = panel.staffRoleIds.length > 0 ? panel.staffRoleIds : config.ticketStaffRoleIds || [];

    // Build channel name from pattern
    const namingPattern = panel.namingPattern || 'ticket-{number}';
    const channelName = namingPattern
      .replace('{number}', ticketNumber.toString().padStart(4, '0'))
      .replace('{username}', interaction.user.username.slice(0, 20))
      .replace('{userid}', interaction.user.id)
      .replace('{displayname}', (interaction.user.displayName || interaction.user.username).slice(0, 20))
      .slice(0, 100);

    // Permission overwrites
    const permissionOverwrites: any[] = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
      },
    ];

    if (interaction.guild.members.me) {
      permissionOverwrites.push({
        id: interaction.guild.members.me.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    for (const roleId of staffRoleIds) {
      permissionOverwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
      });
    }

    // Create channel
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || undefined,
      permissionOverwrites,
      topic: `Ticket #${ticketNumber} | Created by ${interaction.user.username} | Panel: ${panel.name || panel.title}`,
    });

    // Save ticket
    const ticket = await prisma.ticket.create({
      data: {
        guildId: interaction.guild.id,
        panelId: panel.id,
        channelId: channel.id,
        userId: interaction.user.id,
        number: ticketNumber,
        status: 'open',
      },
    });

    // Build welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(parseInt((panel.welcomeColor || '#5865F2').replace('#', ''), 16))
      .setTitle(panel.welcomeTitle || `Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(
        (panel.welcomeMessage || 'Welcome! Please describe your issue.\nA staff member will assist you shortly.')
          .replace('{user}', `<@${interaction.user.id}>`)
          .replace('{number}', ticketNumber.toString().padStart(4, '0'))
          .replace('{panel}', panel.name || panel.title)
      )
      .setTimestamp()
      .setFooter({ text: `Ticket #${ticketNumber.toString().padStart(4, '0')} | ${panel.name || panel.title}` });

    // Add form answers to embed if present
    if (formAnswers && formAnswers.length > 0) {
      for (const fa of formAnswers) {
        welcomeEmbed.addFields({
          name: fa.question,
          value: fa.answer.slice(0, 1024) || 'No answer',
        });
      }
    }

    // Build mention string
    const mentions: string[] = [];
    if (panel.mentionCreator !== false) mentions.push(`<@${interaction.user.id}>`);
    if (panel.mentionStaff !== false) {
      for (const roleId of staffRoleIds) {
        mentions.push(`<@&${roleId}>`);
      }
    }

    await channel.send({
      content: mentions.length > 0 ? mentions.join(' ') : undefined,
      embeds: [welcomeEmbed],
      components: [getTicketActionRow(panel)],
    });

    await interaction.editReply({ content: `Your ticket has been created: <#${channel.id}>` });

    // Log
    const logChannelId = panel.logChannelId || config.ticketLogChannelId;
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(SUCCESS_COLOR)
              .setTitle('Ticket Created')
              .addFields(
                { name: 'Ticket', value: `#${ticketNumber.toString().padStart(4, '0')} (<#${channel.id}>)`, inline: true },
                { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                { name: 'Panel', value: panel.name || panel.title, inline: true }
              )
              .setTimestamp(),
          ],
        });
      }
    }
  } catch (err) {
    logger.error(`[Tickets] Error creating ticket: ${err}`);
    await interaction.editReply({ content: 'Failed to create ticket. Please try again or contact an admin.' }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════
// CLOSE REQUEST (confirmation)
// ═══════════════════════════════════════════════════════════════

export async function handleTicketCloseButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket || ticket.status !== 'open') {
    await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
    return;
  }

  const panel = ticket.panel;

  // If close request is enabled, show confirmation
  if (panel?.closeRequestEnabled !== false) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(WARNING_COLOR)
      .setTitle('Close Ticket?')
      .setDescription(
        panel?.closeRequestMessage || 'Are you sure you want to close this ticket?'
      )
      .setFooter({ text: `Requested by ${interaction.user.username}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_confirm_close_${interaction.user.id}`)
        .setLabel('Confirm Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_cancel_close')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row] });
    return;
  }

  // No confirmation — close immediately
  await interaction.deferReply();
  await closeTicket(interaction, ticket);
}

export async function handleTicketConfirmClose(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket || ticket.status !== 'open') {
    await interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  // Delete the confirmation message
  try { await interaction.message.delete(); } catch {}

  await closeTicket(interaction, ticket);
}

export async function handleTicketCancelClose(interaction: ButtonInteraction): Promise<void> {
  try { await interaction.message.delete(); } catch {}
  await interaction.deferUpdate().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// CORE: CLOSE TICKET
// ═══════════════════════════════════════════════════════════════

async function closeTicket(interaction: ButtonInteraction, ticket: any, reason?: string): Promise<void> {
  if (!interaction.guild) return;

  const channel = interaction.channel as TextChannel;
  const panel = ticket.panel;
  const config = await getGuildConfig(interaction.guild.id);

  // Generate transcript if enabled
  let transcriptResult: { html: string; messages: TranscriptMessage[]; transcriptId: string } | null = null;
  if (panel?.transcriptEnabled !== false) {
    try {
      transcriptResult = await generateTranscript(channel, ticket, interaction.user.id);
    } catch (err) {
      logger.error(`[Tickets] Transcript generation failed: ${err}`);
    }
  }

  // Update ticket in DB
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closedBy: interaction.user.id,
      closeReason: reason || null,
    },
  });

  // Update channel: remove user access, rename, move to closed category
  try {
    await channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: false,
      SendMessages: false,
    });

    // Also remove added users' access
    if (ticket.addedUsers?.length > 0) {
      for (const userId of ticket.addedUsers) {
        await channel.permissionOverwrites.edit(userId, {
          ViewChannel: false,
          SendMessages: false,
        }).catch(() => {});
      }
    }

    await channel.setName(`closed-${ticket.number.toString().padStart(4, '0')}`).catch(() => {});

    // Move to closed category if set
    if (panel?.closedCategoryId) {
      await channel.setParent(panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
    }
  } catch (err) {
    logger.error(`[Tickets] Error updating closed channel: ${err}`);
  }

  // Send closed embed
  const closedEmbed = new EmbedBuilder()
    .setColor(CLOSE_COLOR)
    .setTitle('Ticket Closed')
    .setDescription(
      `This ticket was closed by <@${interaction.user.id}>.` +
      (reason ? `\n**Reason:** ${reason}` : '') +
      (transcriptResult ? `\n\nTranscript saved (${transcriptResult.messages.length} messages).` : '')
    )
    .setTimestamp();

  await channel.send({ embeds: [closedEmbed], components: [getClosedActionRow()] });

  // Send transcript to transcript channel
  if (transcriptResult && (panel?.transcriptChannelId || config.ticketTranscriptChannelId)) {
    const transcriptChannelId = panel?.transcriptChannelId || config.ticketTranscriptChannelId;
    const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId) as TextChannel;
    if (transcriptChannel) {
      const buf = Buffer.from(transcriptResult.html, 'utf-8');
      const attachment = new AttachmentBuilder(buf, {
        name: `transcript-${ticket.number.toString().padStart(4, '0')}.html`,
      });

      await transcriptChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle(`Transcript: Ticket #${ticket.number.toString().padStart(4, '0')}`)
            .addFields(
              { name: 'Created By', value: `<@${ticket.userId}>`, inline: true },
              { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Messages', value: `${transcriptResult.messages.length}`, inline: true },
              { name: 'Panel', value: panel?.name || panel?.title || 'Default', inline: true }
            )
            .setTimestamp(),
        ],
        files: [attachment],
      }).catch((err) => logger.error(`[Tickets] Failed to send transcript: ${err}`));
    }
  }

  // DM transcript to user
  if (transcriptResult && (panel?.transcriptDMUser !== false || config.ticketDMTranscript)) {
    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      const buf = Buffer.from(transcriptResult.html, 'utf-8');
      const attachment = new AttachmentBuilder(buf, {
        name: `transcript-${ticket.number.toString().padStart(4, '0')}.html`,
      });
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle('Ticket Closed')
            .setDescription(`Your ticket #${ticket.number.toString().padStart(4, '0')} in **${interaction.guild.name}** has been closed. The transcript is attached below.`)
            .setTimestamp(),
        ],
        files: [attachment],
      });
    } catch {
      // User has DMs disabled — ignore
    }
  }

  // DM transcript to claiming staff
  if (transcriptResult && panel?.transcriptDMStaff && ticket.claimedBy) {
    try {
      const staff = await interaction.client.users.fetch(ticket.claimedBy);
      const buf = Buffer.from(transcriptResult.html, 'utf-8');
      const attachment = new AttachmentBuilder(buf, {
        name: `transcript-${ticket.number.toString().padStart(4, '0')}.html`,
      });
      await staff.send({
        embeds: [
          new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle('Ticket Closed — Transcript')
            .setDescription(`Ticket #${ticket.number.toString().padStart(4, '0')} that you claimed has been closed.`)
            .setTimestamp(),
        ],
        files: [attachment],
      });
    } catch {}
  }

  // Log
  const logChannelId = panel?.logChannelId || config.ticketLogChannelId;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(CLOSE_COLOR)
            .setTitle('Ticket Closed')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Messages', value: `${transcriptResult?.messages.length || '?'}`, inline: true },
              { name: 'Reason', value: reason || 'No reason', inline: true }
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  }

  // Feedback (if enabled)
  if (panel?.feedbackEnabled) {
    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      const feedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...[1, 2, 3, 4, 5].map((n) =>
          new ButtonBuilder()
            .setCustomId(`ticket_feedback_${ticket.id}_${n}`)
            .setLabel(`${'⭐'.repeat(n)}`)
            .setStyle(n >= 4 ? ButtonStyle.Success : n >= 2 ? ButtonStyle.Secondary : ButtonStyle.Danger)
        )
      );
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(TICKET_COLOR)
            .setTitle('Rate Your Experience')
            .setDescription(panel.feedbackMessage || 'How would you rate the support you received?')
            .setFooter({ text: `Ticket #${ticket.number.toString().padStart(4, '0')}` }),
        ],
        components: [feedbackRow],
      });
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// REOPEN
// ═══════════════════════════════════════════════════════════════

export async function handleTicketReopen(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

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

  // Restore user access
  await channel.permissionOverwrites.edit(ticket.userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  }).catch(() => {});

  // Restore added users
  if (ticket.addedUsers?.length > 0) {
    for (const userId of ticket.addedUsers as string[]) {
      await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      }).catch(() => {});
    }
  }

  // Restore channel name
  const panel = ticket.panel;
  const namingPattern = panel?.namingPattern || 'ticket-{number}';
  const channelName = namingPattern
    .replace('{number}', ticket.number.toString().padStart(4, '0'))
    .replace('{username}', 'user')
    .replace('{userid}', ticket.userId)
    .slice(0, 100);
  await channel.setName(channelName).catch(() => {});

  // Move back to open category
  if (panel?.categoryId) {
    await channel.setParent(panel.categoryId, { lockPermissions: false }).catch(() => {});
  }

  const reopenEmbed = new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setTitle('Ticket Reopened')
    .setDescription(`This ticket was reopened by <@${interaction.user.id}>.`)
    .setTimestamp();

  await interaction.reply({ embeds: [reopenEmbed], components: [getTicketActionRow(panel)] });

  // Log
  const config = await getGuildConfig(interaction.guild.id);
  const logChannelId = panel?.logChannelId || config.ticketLogChannelId;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(SUCCESS_COLOR)
            .setTitle('Ticket Reopened')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Reopened By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

export async function handleTicketDelete(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket) {
    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    return;
  }

  // Only staff or admins can delete
  const member = interaction.member as GuildMember;
  const isStaff = ticket.panel?.staffRoleIds.some((id: string) => member.roles.cache.has(id)) ||
    ticket.panel?.adminRoleIds?.some((id: string) => member.roles.cache.has(id)) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isStaff) {
    await interaction.reply({ content: 'Only staff can delete tickets.', ephemeral: true });
    return;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'deleted' },
  });

  await interaction.reply({ content: 'This ticket will be deleted in 5 seconds...' });

  // Log before deleting
  const config = await getGuildConfig(interaction.guild.id);
  const logChannelId = ticket.panel?.logChannelId || config.ticketLogChannelId;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(CLOSE_COLOR)
            .setTitle('Ticket Deleted')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Deleted By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Creator', value: `<@${ticket.userId}>`, inline: true }
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  }

  setTimeout(async () => {
    try {
      const ch = interaction.guild!.channels.cache.get(ticket.channelId);
      if (ch) await ch.delete('Ticket deleted');
    } catch {}
  }, 5000);
}

// ═══════════════════════════════════════════════════════════════
// CLAIM
// ═══════════════════════════════════════════════════════════════

export async function handleTicketClaim(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket || ticket.status !== 'open') {
    await interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });
    return;
  }

  if (!ticket.panel?.claimEnabled) {
    await interaction.reply({ content: 'Claiming is not enabled for this panel.', ephemeral: true });
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

  // If claimLockOthers is on, remove send permission from other staff
  if (ticket.panel?.claimLockOthers) {
    const channel = interaction.channel as TextChannel;
    for (const roleId of ticket.panel.staffRoleIds) {
      await channel.permissionOverwrites.edit(roleId, {
        SendMessages: false,
      }).catch(() => {});
    }
    // Give the claimer explicit send permission
    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }).catch(() => {});
  }

  const claimEmbed = new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setDescription(`🙋 This ticket has been claimed by <@${interaction.user.id}>.`)
    .setTimestamp();

  await interaction.reply({ embeds: [claimEmbed] });

  // Log
  const config = await getGuildConfig(interaction.guild.id);
  const logChannelId = ticket.panel?.logChannelId || config.ticketLogChannelId;
  if (logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle('Ticket Claimed')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Claimed By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT (button in ticket)
// ═══════════════════════════════════════════════════════════════

export async function handleTicketTranscriptButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket) {
    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel;
  const { html, messages } = await generateTranscript(channel, ticket, interaction.user.id);

  const buf = Buffer.from(html, 'utf-8');
  const attachment = new AttachmentBuilder(buf, {
    name: `transcript-${ticket.number.toString().padStart(4, '0')}.html`,
  });

  await interaction.editReply({
    content: `Transcript generated: **${messages.length} messages**. Open the HTML file in a browser to view.`,
    files: [attachment],
  });
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK RATING
// ═══════════════════════════════════════════════════════════════

export async function handleTicketFeedback(interaction: ButtonInteraction): Promise<void> {
  // Format: ticket_feedback_{ticketId}_{rating}
  const parts = interaction.customId.split('_');
  const ticketId = parts[2];
  const rating = parseInt(parts[3], 10);

  if (!ticketId || isNaN(rating) || rating < 1 || rating > 5) {
    await interaction.reply({ content: 'Invalid feedback.', ephemeral: true });
    return;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { rating },
  });

  // Disable all buttons
  try {
    const row = ActionRowBuilder.from(interaction.message.components[0] as any) as ActionRowBuilder<ButtonBuilder>;
    row.components.forEach((btn) => btn.setDisabled(true));
    await interaction.message.edit({ components: [row] });
  } catch {}

  await interaction.reply({
    content: `Thank you for your feedback! You rated this ticket **${'⭐'.repeat(rating)}** (${rating}/5).`,
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPORT for command usage
// ═══════════════════════════════════════════════════════════════

export { generateHtmlTranscript, fetchChannelMessages, getTicketActionRow, getClosedActionRow };
