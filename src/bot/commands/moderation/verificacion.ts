/**
 * /verificacion — Verifica un usuario: le da el rol verificado, envía DM,
 * anuncia la verificación y envía una transcripción al canal de logs.
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
} from "discord.js";
import logger from "../../../shared/logger";
import { fetchChannelMessages, generateHtmlTranscript } from "../../modules/tickets/ticketManager";
import { getGuildConfig } from "../../utils";

export default {
  data: new SlashCommandBuilder()
    .setName("verificacion")
    .setDescription("Verifica un usuario, le da el rol y registra la transcripción")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a verificar").setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName("rol").setDescription("Rol a asignar (opcional, sobrescribe la config)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guild = interaction.guild!;
    const config = await getGuildConfig(guild.id);
    const target = interaction.options.getMember("usuario");

    if (!target || (typeof target === "object" && !("roles" in target))) {
      await interaction.editReply({ content: "No se encontró al usuario en el servidor." });
      return;
    }

    const member = target as import("discord.js").GuildMember;

    // Determinar rol de verificación
    const roleOption = interaction.options.getRole("rol");
    const verifiedRoleId = roleOption?.id || config.joinRoleIds?.[0];
    if (!verifiedRoleId) {
      await interaction.editReply({
        content: "No se ha configurado un rol de verificación. Usa la opción `rol` o configura `joinRoleIds` en `/configuracion`.",
      });
      return;
    }

    const role = guild.roles.cache.get(verifiedRoleId);
    if (!role) {
      await interaction.editReply({ content: `No se encontró el rol de verificación (${verifiedRoleId}).` });
      return;
    }

    // Asignar rol
    try {
      await member.roles.add(role, `Verificado por ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`[Verificacion] No se pudo dar el rol: ${err}`);
      await interaction.editReply({ content: "No tengo permisos para asignar ese rol." });
      return;
    }

    // Enviar DM al usuario verificado
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`✅ ¡Has sido verificado en ${guild.name}!`)
        .setDescription(
          `Has sido verificado exitosamente por **${interaction.user.tag}**.\n\n` +
          `Ya tienes acceso completo al servidor. ¡Bienvenido!`
        )
        .setThumbnail(guild.iconURL({ size: 128 }) ?? null)
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] });
    } catch {
      // DMs cerrados — no es un error crítico
      logger.warn(`[Verificacion] No se pudo enviar DM a ${member.user.tag} (DMs cerrados)`);
    }

    // Embed de confirmación en el canal
    const verifiedEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Usuario verificado")
      .setDescription(`${member} ha sido verificado correctamente.`)
      .addFields(
        { name: "Usuario", value: member.user.tag, inline: true },
        { name: "ID", value: member.user.id, inline: true },
        { name: "Verificado por", value: interaction.user.tag, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({ embeds: [verifiedEmbed] });

    // Generar transcripción del canal actual
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

    // Enviar al canal de logs de verificación
    const logChannelId = config.modLogChannelId || "1449265811624820797";
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (!logChannel) {
      logger.warn(`[Verificacion] Canal de logs ${logChannelId} no encontrado`);
      return;
    }

    // Mensaje con ID buscable
    await logChannel.send(`🔍 ID: ${member.user.id} — ${member.user.tag}`).catch(() => {});

    // Embed de log
    const logEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📋 Registro de verificación")
      .addFields(
        { name: "Usuario", value: member.user.tag, inline: true },
        { name: "ID de Discord", value: `\`${member.user.id}\``, inline: true },
        { name: "Verificado por", value: interaction.user.tag, inline: true },
        { name: "Canal", value: `<#${channel.id}>`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    if (!htmlContent) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      return;
    }

    const buf = Buffer.from(htmlContent, "utf-8");
    const attachment = new AttachmentBuilder(buf, { name: `verificacion-${member.user.id}.html` });

    const logMsg = await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch((err) => {
      logger.error(`[Verificacion] Error enviando log: ${err}`);
      return null;
    });

    // Botón para abrir transcripción
    if (logMsg) {
      const fileUrl = logMsg.attachments.first()?.url;
      if (fileUrl) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("📄 Abrir transcripción")
            .setStyle(ButtonStyle.Link)
            .setURL(fileUrl),
        );
        await logMsg.edit({ components: [row] }).catch(() => {});
      }
    }
  },
};
