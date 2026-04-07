import {
  ButtonInteraction,
  Message,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  CategoryChannel,
} from 'discord.js';
import { getGuildConfig } from '../../utils';
import logger from '../../../shared/logger';

const INTEREST_CHANNEL_ID = `1449231877989728307`;
const INTEREST_CATEGORY_ID = `1489316540980662332`;
const INTEREST_BUTTON_CUSTOM_ID = `interest_create_1489316540980662332`;

// Track last button message per channel to avoid full search
const lastButtonMessageId = new Map<string, string>();

export { INTEREST_CHANNEL_ID, INTEREST_BUTTON_CUSTOM_ID, lastButtonMessageId };

/**
 * Called from messageCreate when a non-bot message is sent in INTEREST_CHANNEL_ID.
 * Deletes the previous interest button message and posts a new one.
 */
export async function handleInterestChannelMessage(message: Message, _client: Client): Promise<void> {
  const channel = message.channel as TextChannel;

  // Try to delete previous button message
  const prevId = lastButtonMessageId.get(INTEREST_CHANNEL_ID);
  if (prevId) {
    try {
      const prevMsg = await channel.messages.fetch(prevId).catch(() => null);
      if (prevMsg && prevMsg.components.length > 0) {
        await prevMsg.delete().catch(() => {});
      }
    } catch { /* ignore */ }
    lastButtonMessageId.delete(INTEREST_CHANNEL_ID);
  } else {
    // Search channel for any existing bot message with components
    try {
      const recent = await channel.messages.fetch({ limit: 30 });
      for (const msg of recent.values()) {
        if (msg.author.bot && msg.components.length > 0) {
          await msg.delete().catch(() => {});
          break;
        }
      }
    } catch { /* ignore */ }
  }

  // Post new interest button message
  try {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`¿Estás interesado en alguna publicación?`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(INTEREST_BUTTON_CUSTOM_ID)
        .setLabel(`🎫 Estoy interesado`)
        .setStyle(ButtonStyle.Success),
    );

    const sent = await channel.send({ embeds: [embed], components: [row] });
    lastButtonMessageId.set(INTEREST_CHANNEL_ID, sent.id);
    logger.info(`[Interest] Posted new interest button message: ${sent.id}`);
  } catch (err) {
    logger.error(`[Interest] Failed to post interest button: ${err}`);
  }
}

/**
 * Called from interactionCreate when interest_create_* button is clicked.
 */
export async function handleInterestCreate(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: `Solo disponible en un servidor.`, flags: 64 });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const username = interaction.user.username;

  // Check for existing interest channel
  const existingChannel = guild.channels.cache.find(
    (ch: any) =>
      ch.name.startsWith(`interes-`) &&
      ch.isTextBased() &&
      (ch as TextChannel).topic?.includes(`userId:${userId}`),
  ) as TextChannel | undefined;

  if (existingChannel) {
    await interaction.editReply({
      content: `Ya tienes un canal de interés abierto: <#${existingChannel.id}>`,
    });
    return;
  }

  // Get staff role IDs from guild config — filter to roles that exist in this guild
  const config = await getGuildConfig(guild.id);
  const rawStaffRoleIds: string[] = config.ticketStaffRoleIds ?? [];
  const staffRoleIds = rawStaffRoleIds.filter(id => guild.roles.cache.has(id));

  // Fetch category
  let category: CategoryChannel | null = null;
  try {
    category = (await guild.channels.fetch(INTEREST_CATEGORY_ID).catch(() => null)) as CategoryChannel | null;
  } catch { /* ignore */ }

  // Build permission overwrites
  const permissionOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: userId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];

  for (const roleId of staffRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  // Create channel
  let newChannel: TextChannel;
  try {
    newChannel = await guild.channels.create({
      name: `interes-${username}`,
      type: ChannelType.GuildText,
      parent: category?.id ?? INTEREST_CATEGORY_ID,
      topic: `userId:${userId}`,
      permissionOverwrites,
    }) as TextChannel;
  } catch (err) {
    logger.error(`[Interest] Failed to create interest channel: ${err}`);
    await interaction.editReply({ content: `No se pudo crear el canal. Contacta a un administrador.` });
    return;
  }

  // Send welcome embed in new channel
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Solicitud de interés`)
    .setDescription(
      `<@${userId}>, gracias por tu interés. Por favor describe en qué publicación estás interesado y el equipo te atenderá pronto.`
    )
    .setTimestamp();

  const staffPings = staffRoleIds.map((rid) => `<@&${rid}>`).join(' ');

  try {
    await newChannel.send({
      content: staffPings ? staffPings : undefined,
      embeds: [welcomeEmbed],
    });
  } catch (err) {
    logger.error(`[Interest] Failed to send welcome embed: ${err}`);
  }

  await interaction.editReply({
    content: `✅ Se ha creado tu canal de interés: <#${newChannel.id}>`,
  });

  logger.info(`[Interest] Created interest channel ${newChannel.name} for user ${username} (${userId})`);
}
