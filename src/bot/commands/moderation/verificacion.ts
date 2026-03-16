/**
 * /verificacion — Verifica un usuario: le da el rol verificado, anuncia la verificación
 * y envía una transcripción del canal actual al canal de logs de verificación.
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import logger from '../../../shared/logger';
import { fetchChannelMessages, generateHtmlTranscript } from '../../modules/tickets/ticketManager';

const VERIFIED_ROLE_ID = '1474523764397179103';
const VERIFICATION_LOG_CHANNEL_ID = '1449265811624820797';

export default {
  data: new SlashCommandBuilder()
    .setName('verificacion')
    .setDescription('Verifica un usuario, le da el rol y registra la transcripción')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Usuario a verificar').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guild = interaction.guild!;
    const target = interaction.options.getMember('usuario');

    if (!target || typeof target === 'object' && !('roles' in target)) {
      await interaction.editReply({ content: 'No se encontró al usuario en el servidor.' });
      return;
    }

    const member = target as import('discord.js').GuildMember;

    // Give verified role
    const role = guild.roles.cache.get(VERIFIED_ROLE_ID);
    if (!role) {
      await interaction.editReply({ content: `No se encontró el rol de verificación (${VERIFIED_ROLE_ID}).` });
      return;
    }

    try {
      await member.roles.add(role, `Verificado por ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`[Verificacion] No se pudo dar el rol: ${err}`);
      await interaction.editReply({ content: 'No tengo permisos para asignar ese rol.' });
      return;
    }

    // Announce in current channel
    const verifiedEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Usuario verificado')
      .setDescription(`${member} ha sido verificado correctamente.`)
      .addFields(
        { name: 'Usuario', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.user.id, inline: true },
        { name: 'Verificado por', value: `${interaction.user.tag}`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({ embeds: [verifiedEmbed] });

    // Generate transcript of current channel
    const channel = interaction.channel as TextChannel;
    let htmlContent: string | null = null;

    try {
      const messages = await fetchChannelMessages(channel);
      htmlContent = generateHtmlTranscript(messages, {
        number: 0,
        userId: member.user.id,
        guildName: guild.name,
        channelName: channel.name,
        createdAt: new Date(),
        closedAt: new Date(),
      });
    } catch (err) {
      logger.error(`[Verificacion] Error generando transcripción: ${err}`);
    }

    // Send to verification log channel
    const logChannel = guild.channels.cache.get(VERIFICATION_LOG_CHANNEL_ID) as TextChannel | undefined;
    if (!logChannel) {
      logger.warn(`[Verificacion] Canal de logs ${VERIFICATION_LOG_CHANNEL_ID} no encontrado`);
      return;
    }

    // 1. Plain text message with just the Discord ID (searchable with Ctrl+F / Discord search)
    await logChannel.send(`🔍 ID: ${member.user.id} — ${member.user.tag}`).catch(() => {});

    // 2. Build embed
    const logEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('📋 Registro de verificación')
      .addFields(
        { name: 'Usuario', value: `${member.user.tag}`, inline: true },
        { name: 'ID de Discord', value: `\`${member.user.id}\``, inline: true },
        { name: 'Verificado por', value: `${interaction.user.tag}`, inline: true },
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    // 3. Send embed + HTML attachment
    if (!htmlContent) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      return;
    }

    const buf = Buffer.from(htmlContent, 'utf-8');
    const attachment = new AttachmentBuilder(buf, { name: `verificacion-${member.user.id}.html` });

    const logMsg = await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch((err) => {
      logger.error(`[Verificacion] Error enviando log: ${err}`);
      return null;
    });

    // 4. Get the CDN URL of the uploaded file and add an "Abrir transcripción" button
    if (logMsg) {
      const fileUrl = logMsg.attachments.first()?.url;
      if (fileUrl) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('📄 Abrir transcripción')
            .setStyle(ButtonStyle.Link)
            .setURL(fileUrl),
        );
        await logMsg.edit({ components: [row] }).catch(() => {});
      }
    }
  },
};
