import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
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
  Client,
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
        return `<div class="attachment"><a href="${escapeHtml(url)}" target="_blank">Adjunto</a></div>`;
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
  const closedStr = ticketInfo.closedAt ? ticketInfo.closedAt.toLocaleString('en-US') : 'Sigue abierto';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcripcion - Ticket #${ticketInfo.number}</title>
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
      <span>Servidor: ${escapeHtml(ticketInfo.guildName)}</span>
      <span>Canal: ${escapeHtml(ticketInfo.channelName)}</span>
      <span>Creado: ${createdStr}</span>
      <span>Cerrado: ${closedStr}</span>
      <span>Mensajes: ${messages.length}</span>
    </div>
  </div>
  <div class="messages">
    ${messageHtml}
  </div>
  <div class="footer">
    Generado por Vapiano Bot &bull; ${new Date().toLocaleString('en-US')}
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
        .setLabel('Cerrar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );
  }

  if (panel?.showClaimButton !== false && panel?.claimEnabled !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Reclamar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🙋')
    );
  }

  if (panel?.showTranscriptButton !== false && panel?.transcriptEnabled !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Transcripcion')
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
      .setLabel('Reabrir')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓'),
    new ButtonBuilder()
      .setCustomId('ticket_delete')
      .setLabel('Eliminar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
    new ButtonBuilder()
      .setCustomId('ticket_transcript')
      .setLabel('Transcripcion')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋')
  );
}

// ═══════════════════════════════════════════════════════════════
// TICKET CREATION — Button Click
// ═══════════════════════════════════════════════════════════════

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  logger.info(`[Tickets] Button clicked: ${interaction.customId} by ${interaction.user.id} in guild ${interaction.guildId} (guild=${!!interaction.guild}, member=${!!interaction.member})`);
  if (!interaction.guild || !interaction.member) {
    logger.warn(`[Tickets] Early return: guild=${!!interaction.guild}, member=${!!interaction.member}`);
    return;
  }

  const panelId = interaction.customId.replace('ticket_create_', '');
  const panel = await prisma.ticketPanel.findUnique({ where: { id: panelId } });
  if (!panel) {
    await interaction.reply({ content: 'Este panel de tickets ya no existe.', ephemeral: true });
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
      content: `Ya tienes ${openCount} ticket(s) abierto(s) (límite: ${limit}).${existingTicket ? ` Ve a <#${existingTicket.channelId}>` : ''}`,
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
        .setTitle(panel.formTitle || 'Formulario de ticket');

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
    await interaction.reply({ content: 'Este panel de tickets ya no existe.', ephemeral: true });
    return;
  }

  const openCount = await prisma.ticket.count({
    where: { guildId: interaction.guild.id, userId: interaction.user.id, panelId: panel.id, status: 'open' },
  });
  if (openCount >= (panel.ticketLimit || 1)) {
    await interaction.reply({ content: 'Ya tienes el máximo de tickets abiertos para esta categoría.', ephemeral: true });
    return;
  }

  if (panel.formEnabled && panel.formQuestions) {
    const questions = panel.formQuestions as Array<any>;
    if (questions.length > 0) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_form_${panelId}`)
        .setTitle(panel.formTitle || 'Formulario de ticket');
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
    await interaction.reply({ content: 'El panel ya no existe.', ephemeral: true });
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
      topic: `Ticket #${ticketNumber} | Creado por ${interaction.user.username} | Panel: ${panel.name || panel.title}`,
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
      .setTitle(
        (panel.welcomeTitle || `Ticket #${ticketNumber.toString().padStart(4, '0')}`)
          .replace('{user}', interaction.user.username)
          .replace('{number}', ticketNumber.toString().padStart(4, '0'))
          .replace('{panel}', panel.name || panel.title)
      )
      .setDescription(
        (panel.welcomeMessage || '¡Bienvenido! Describe tu problema.\nUn miembro del staff te ayudará pronto.')
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
          value: fa.answer.slice(0, 1024) || '(Sin respuesta)',
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

    await interaction.editReply({ content: `Tu ticket ha sido creado: <#${channel.id}>` });

    // Log
    const logChannelId = panel.logChannelId || config.ticketLogChannelId;
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId) as TextChannel;
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(SUCCESS_COLOR)
              .setTitle('Ticket creado')
              .addFields(
                { name: 'Ticket', value: `#${ticketNumber.toString().padStart(4, '0')} (<#${channel.id}>)`, inline: true },
                { name: 'Usuario', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                { name: 'Panel', value: panel.name || panel.title, inline: true }
              )
              .setTimestamp(),
          ],
        });
      }
    }
  } catch (err) {
    logger.error(`[Tickets] Error creating ticket: ${err}`);
    await interaction.editReply({ content: 'No se pudo crear el ticket. Intenta de nuevo o contacta a un admin.' }).catch(() => {});
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
    await interaction.reply({ content: 'Este no es un ticket abierto.', ephemeral: true });
    return;
  }

  const panel = ticket.panel;

  // If close request is enabled, show confirmation
  if (panel?.closeRequestEnabled !== false) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(WARNING_COLOR)
      .setTitle('¿Cerrar ticket?')
      .setDescription(
        panel?.closeRequestMessage || '¿Estás seguro de que quieres cerrar este ticket?'
      )
      .setFooter({ text: `Solicitado por ${interaction.user.username}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_confirm_close_${interaction.user.id}`)
        .setLabel('Confirmar cierre')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_cancel_close')
        .setLabel('Cancelar')
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
    await interaction.reply({ content: 'Este ticket ya está cerrado.', ephemeral: true });
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

    await channel.setName(`cerrado-${ticket.number.toString().padStart(4, '0')}`).catch(() => {});

    // Move to closed category if set
    if (panel?.closedCategoryId) {
      await channel.setParent(panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
    }
  } catch (err) {
    logger.error(`[Tickets] Error updating closed channel: ${err}`);
  }

  // Calcular duración abierto
  const openDurationMs = Date.now() - new Date(ticket.createdAt).getTime();
  const openHours = Math.floor(openDurationMs / 3600000);
  const openMins = Math.floor((openDurationMs % 3600000) / 60000);
  const openDurationStr = openHours > 0 ? `${openHours}h ${openMins}m` : `${openMins}m`;

  // Send closed embed
  const closedEmbed = new EmbedBuilder()
    .setColor(CLOSE_COLOR)
    .setTitle('Ticket cerrado')
    .setDescription(
      `Este ticket fue cerrado por <@${interaction.user.id}>.` +
      (reason ? `\n**Motivo:** ${reason}` : '') +
      `\n**Tiempo abierto:** ${openDurationStr}` +
      (transcriptResult ? `\n\nTranscripción guardada (${transcriptResult.messages.length} mensajes).` : '')
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
            .setTitle(`Transcripción: Ticket #${ticket.number.toString().padStart(4, '0')}`)
            .addFields(
              { name: 'Creado por', value: `<@${ticket.userId}>`, inline: true },
              { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Mensajes', value: `${transcriptResult.messages.length}`, inline: true },
              { name: 'Panel', value: panel?.name || panel?.title || 'Predeterminado', inline: true }
            )
            .setTimestamp(),
        ],
        files: [attachment],
      }).catch((err) => logger.error(`[Tickets] Failed to send transcript: ${err}`));
    }
  }

  // DM transcript to user — only if explicitly enabled on the panel
  if (transcriptResult && panel?.transcriptDMUser === true) {
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
            .setTitle('Ticket cerrado')
            .setDescription(`Tu ticket #${ticket.number.toString().padStart(4, '0')} en **${interaction.guild.name}** fue cerrado. La transcripción está adjunta abajo.`)
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
            .setTitle('Ticket cerrado — Transcripción')
            .setDescription(`El ticket #${ticket.number.toString().padStart(4, '0')} que reclamaste fue cerrado.`)
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
            .setTitle('Ticket cerrado')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Tiempo abierto', value: openDurationStr, inline: true },
              { name: 'Mensajes', value: `${transcriptResult?.messages.length || '?'}`, inline: true },
              { name: 'Motivo', value: reason || 'Sin motivo', inline: true }
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
            .setTitle('¡Califica tu experiencia!')
            .setDescription(panel.feedbackMessage || '¿Cómo calificarías el soporte que recibiste?')
            .setFooter({ text: `Ticket #${ticket.number.toString().padStart(4, '0')}` }),
        ],
        components: [feedbackRow],
      });
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// CLOSE FROM SLASH COMMAND (/cerrar)
// ═══════════════════════════════════════════════════════════════

export async function closeTicketByCommand(interaction: ChatInputCommandInteraction, reason: string): Promise<void> {
  if (!interaction.guild) return;

  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channelId },
    include: { panel: true },
  });

  if (!ticket || ticket.status !== 'open') {
    await interaction.reply({ content: 'Este no es un canal de ticket abierto.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const channel = interaction.channel as TextChannel;
  const panel = ticket.panel;
  const config = await getGuildConfig(interaction.guild.id);

  // Generate transcript
  let transcriptResult: { html: string; messages: TranscriptMessage[]; transcriptId: string } | null = null;
  if (panel?.transcriptEnabled !== false) {
    try {
      transcriptResult = await generateTranscript(channel, ticket, interaction.user.id);
    } catch (err) {
      logger.error(`[Tickets] Transcript generation failed: ${err}`);
    }
  }

  // Update DB
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'closed', closedAt: new Date(), closedBy: interaction.user.id, closeReason: reason },
  });

  // Update channel permissions and rename
  try {
    await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false, SendMessages: false });
    if (ticket.addedUsers?.length > 0) {
      for (const uid of ticket.addedUsers as string[]) {
        await channel.permissionOverwrites.edit(uid, { ViewChannel: false, SendMessages: false }).catch(() => {});
      }
    }
    await channel.setName(`cerrado-${ticket.number.toString().padStart(4, '0')}`).catch(() => {});
    if (panel?.closedCategoryId) {
      await channel.setParent(panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
    }
  } catch (err) {
    logger.error(`[Tickets] Error updating closed channel: ${err}`);
  }

  // Duration
  const openDurationMs = Date.now() - new Date(ticket.createdAt).getTime();
  const openHours = Math.floor(openDurationMs / 3600000);
  const openMins = Math.floor((openDurationMs % 3600000) / 60000);
  const openDurationStr = openHours > 0 ? `${openHours}h ${openMins}m` : `${openMins}m`;

  // Closed embed in channel
  const closedEmbed = new EmbedBuilder()
    .setColor(CLOSE_COLOR)
    .setTitle('Ticket cerrado')
    .setDescription(
      `Este ticket fue cerrado por <@${interaction.user.id}>.\n**Motivo:** ${reason}\n**Tiempo abierto:** ${openDurationStr}` +
      (transcriptResult ? `\n\nTranscripción guardada (${transcriptResult.messages.length} mensajes).` : '')
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [closedEmbed], components: [getClosedActionRow()] as any });

  // DM reason to user
  try {
    const user = await interaction.client.users.fetch(ticket.userId);
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(CLOSE_COLOR)
          .setTitle('Tu ticket fue cerrado')
          .setDescription(`Tu ticket **#${ticket.number.toString().padStart(4, '0')}** en **${interaction.guild.name}** fue cerrado.`)
          .addFields({ name: 'Motivo', value: reason })
          .setTimestamp(),
      ],
    });
  } catch {
    // DMs desactivados
  }

  // Transcript to transcript channel
  if (transcriptResult && (panel?.transcriptChannelId || config.ticketTranscriptChannelId)) {
    const tcId = panel?.transcriptChannelId || config.ticketTranscriptChannelId;
    const tc = interaction.guild.channels.cache.get(tcId) as TextChannel;
    if (tc) {
      const buf = Buffer.from(transcriptResult.html, 'utf-8');
      await tc.send({
        embeds: [
          new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle(`Transcripción: Ticket #${ticket.number.toString().padStart(4, '0')}`)
            .addFields(
              { name: 'Creado por', value: `<@${ticket.userId}>`, inline: true },
              { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Motivo', value: reason, inline: true },
              { name: 'Mensajes', value: `${transcriptResult.messages.length}`, inline: true },
            )
            .setTimestamp(),
        ],
        files: [new AttachmentBuilder(buf, { name: `transcript-${ticket.number.toString().padStart(4, '0')}.html` })],
      }).catch(() => {});
    }
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
            .setTitle('Ticket cerrado')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Tiempo abierto', value: openDurationStr, inline: true },
              { name: 'Motivo', value: reason, inline: true },
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
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
    await interaction.reply({ content: 'Este ticket no está cerrado.', ephemeral: true });
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
    .setTitle('Ticket reabierto')
    .setDescription(`Este ticket fue reabierto por <@${interaction.user.id}>.`)
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
            .setTitle('Ticket reabierto')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Reabierto por', value: `<@${interaction.user.id}>`, inline: true }
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
    await interaction.reply({ content: 'Este no es un canal de ticket.', ephemeral: true });
    return;
  }

  // Only staff or admins can delete
  const member = interaction.member as GuildMember;
  const isStaff = ticket.panel?.staffRoleIds.some((id: string) => member.roles.cache.has(id)) ||
    ticket.panel?.adminRoleIds?.some((id: string) => member.roles.cache.has(id)) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isStaff) {
    await interaction.reply({ content: 'Solo el staff puede eliminar tickets.', ephemeral: true });
    return;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'deleted' },
  });

  await interaction.reply({ content: 'Este ticket se eliminara en 5 segundos...' });

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
            .setTitle('Ticket eliminado')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Eliminado por', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Creador', value: `<@${ticket.userId}>`, inline: true }
            )
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  }

  setTimeout(async () => {
    try {
      const ch = interaction.guild!.channels.cache.get(ticket.channelId);
      if (ch) await ch.delete('Ticket eliminado');
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
    await interaction.reply({ content: 'Este no es un ticket abierto.', ephemeral: true });
    return;
  }

  if (!ticket.panel?.claimEnabled) {
    await interaction.reply({ content: 'Reclamar no está habilitado para este panel.', ephemeral: true });
    return;
  }

  if (ticket.claimedBy) {
    await interaction.reply({
      content: `Este ticket ya fue reclamado por <@${ticket.claimedBy}>.`,
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
    .setDescription(`🙋 Este ticket fue reclamado por <@${interaction.user.id}>.`)
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
            .setTitle('Ticket reclamado')
            .addFields(
              { name: 'Ticket', value: `#${ticket.number.toString().padStart(4, '0')}`, inline: true },
              { name: 'Reclamado por', value: `<@${interaction.user.id}>`, inline: true }
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
    await interaction.reply({ content: 'Este no es un canal de ticket.', ephemeral: true });
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
    content: `Transcripción generada: **${messages.length} mensajes**. Abre el archivo HTML en un navegador para verla.`,
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
    await interaction.reply({ content: 'Valoración inválida.', ephemeral: true });
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
    content: `¡Gracias por tu valoración! Calificaste este ticket con **${'⭐'.repeat(rating)}** (${rating}/5).`,
  });
}

// ═══════════════════════════════════════════════════════════════
// AUTO-CLOSE TIMER
// ═══════════════════════════════════════════════════════════════

/**
 * Check all open tickets against their panel's autoCloseHours setting.
 * Runs every 15 minutes. Closes inactive tickets via the bot client.
 */
async function runAutoClose(client: Client): Promise<void> {
  try {
    // Find all open tickets whose panel has autoCloseHours > 0
    const tickets = await prisma.ticket.findMany({
      where: { status: 'open' },
      include: { panel: true },
    });

    const now = Date.now();

    for (const ticket of tickets) {
      const hours = ticket.panel?.autoCloseHours ?? 0;
      if (hours <= 0) continue;

      const inactiveMs = now - new Date(ticket.lastActivityAt).getTime();
      const thresholdMs = hours * 3600000;

      if (inactiveMs < thresholdMs) continue;

      // Auto-close this ticket
      try {
        const guild = client.guilds.cache.get(ticket.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;

        // Generate transcript
        let transcriptResult: { html: string; messages: TranscriptMessage[]; transcriptId: string } | null = null;
        if (channel && ticket.panel?.transcriptEnabled !== false) {
          transcriptResult = await generateTranscript(channel, ticket, 'auto-close').catch(() => null);
        }

        // Update DB
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'closed', closedAt: new Date(), closedBy: 'auto-close', closeReason: 'Cierre automático por inactividad' },
        });

        if (channel) {
          // Remove user access and rename
          await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false, SendMessages: false }).catch(() => {});
          for (const uid of ticket.addedUsers as string[]) {
            await channel.permissionOverwrites.edit(uid, { ViewChannel: false, SendMessages: false }).catch(() => {});
          }
          if (ticket.panel?.closedCategoryId) {
            await channel.setParent(ticket.panel.closedCategoryId, { lockPermissions: false }).catch(() => {});
          }
          const ticketNum = ticket.number.toString().padStart(4, '0');
          await channel.setName(`cerrado-${ticketNum}`).catch(() => {});

          const closeEmbed = new EmbedBuilder()
            .setColor(CLOSE_COLOR)
            .setTitle('Ticket cerrado automáticamente')
            .setDescription(`Este ticket fue cerrado por inactividad (${hours}h sin actividad).`)
            .setTimestamp();

          await channel.send({ embeds: [closeEmbed], components: [getClosedActionRow()] }).catch(() => {});
        }

        // Send transcript
        if (transcriptResult) {
          const ticketNum = ticket.number.toString().padStart(4, '0');
          const transcriptBuf = Buffer.from(transcriptResult.html, 'utf-8');
          const config = await getGuildConfig(ticket.guildId).catch(() => null);
          const transcriptChannelId = ticket.panel?.transcriptChannelId || config?.ticketTranscriptChannelId;
          if (transcriptChannelId && guild) {
            const tCh = guild.channels.cache.get(transcriptChannelId) as TextChannel | undefined;
            if (tCh) {
              await tCh.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(INFO_COLOR)
                    .setTitle(`Transcripción: Ticket #${ticketNum}`)
                    .addFields(
                      { name: 'Cerrado por', value: 'Auto-cierre (inactividad)', inline: true },
                      { name: 'Mensajes', value: `${transcriptResult.messages.length}`, inline: true }
                    )
                    .setTimestamp(),
                ],
                files: [new AttachmentBuilder(transcriptBuf, { name: `transcript-${ticketNum}.html` })],
              }).catch(() => {});
            }
          }

          // DM transcript to user
          if (ticket.panel?.transcriptDMUser !== false || config?.ticketDMTranscript) {
            try {
              const user = await client.users.fetch(ticket.userId);
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(INFO_COLOR)
                    .setTitle('Ticket cerrado')
                    .setDescription(`Tu ticket #${ticketNum} fue cerrado automáticamente por inactividad.`)
                    .setTimestamp(),
                ],
                files: [new AttachmentBuilder(transcriptBuf, { name: `transcript-${ticketNum}.html` })],
              });
            } catch {}
          }
        }

        logger.info(`[Tickets] Auto-closed ticket #${ticket.number} (${ticket.guildId}) after ${hours}h inactivity`);
      } catch (err) {
        logger.error(`[Tickets] Error auto-closing ticket ${ticket.id}: ${err}`);
      }
    }
  } catch (err) {
    logger.error(`[Tickets] Auto-close check failed: ${err}`);
  }
}

/**
 * Initialize the auto-close timer. Checks every 15 minutes.
 */
export function initAutoClose(client: Client): void {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  setInterval(() => runAutoClose(client), INTERVAL_MS);
  logger.info('[Tickets] Auto-close timer initialized (15 min interval)');
}

// ═══════════════════════════════════════════════════════════════
// EXPORT for command usage
// ═══════════════════════════════════════════════════════════════

export { generateHtmlTranscript, fetchChannelMessages, getTicketActionRow, getClosedActionRow };
