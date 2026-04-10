/**
 * /dar-rango — Asigna un rango/rol a un usuario, envía DM personalizado según el rol
 * y registra la transcripción del canal en el canal de logs de verificación.
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

const DEFAULT_ACCESS_MSG = "¡Felicidades! 🎉\n\nAhora tienes el rango **{rol}**.\n\nYa puedes hacer tus **publicaciones OOC** en los canales correspondientes.";
const DEFAULT_VIP_MSG    = "¡Felicidades! ⭐\n\nAhora tienes el rango **{rol}**.\n\nYa puedes acceder a los **canales VIP** exclusivos y usar el **@everyone moderadamente**.";
const DEFAULT_MSG        = "¡Felicidades! 🎉\n\nSe te ha asignado el rango **{rol}**.\n\nDisfruta de tus nuevos privilegios.";

function buildDmMessage(template: string, roleName: string, userId: string): string {
  return `<@${userId}> ` + template.replace(/\{rol\}/g, roleName);
}

function getDmMessage(roleName: string, userId: string, config: any): string {
  const name = roleName.toLowerCase();
  if (name.includes("access")) {
    return buildDmMessage((config as any).darRangoAccessMessage || DEFAULT_ACCESS_MSG, roleName, userId);
  }
  if (name.includes("vip")) {
    return buildDmMessage((config as any).darRangoVipMessage || DEFAULT_VIP_MSG, roleName, userId);
  }
  return buildDmMessage((config as any).darRangoDefaultMessage || DEFAULT_MSG, roleName, userId);
}

export default {
  data: new SlashCommandBuilder()
    .setName("dar-rango")
    .setDescription("Asigna un rango/rol a un usuario y registra la transcripción")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario al que asignar el rango").setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName("rol").setDescription("Rol a asignar").setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt
        .setName("anunciar")
        .setDescription("¿Mostrar anuncio público en este canal mencionando al usuario?")
        .setRequired(false)
    ),
  module: "moderation",

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild!;
    const config = await getGuildConfig(guild.id);
    const target = interaction.options.getMember("usuario");

    if (!target || (typeof target === "object" && !("roles" in target))) {
      await interaction.editReply({ content: "No se encontró al usuario en el servidor." });
      return;
    }

    const member = target as import("discord.js").GuildMember;
    const roleOption = interaction.options.getRole("rol", true);
    const anunciar = interaction.options.getBoolean("anunciar") ?? false;
    const role = guild.roles.cache.get(roleOption.id);

    if (!role) {
      await interaction.editReply({ content: `No se encontró el rol (${roleOption.id}).` });
      return;
    }

    // Asignar rol
    try {
      await member.roles.add(role, `Rango dado por ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`[DarRango] No se pudo dar el rol: ${err}`);
      await interaction.editReply({ content: "No tengo permisos para asignar ese rol." });
      return;
    }

    // Enviar DM personalizado según el rol
    try {
      const dmMessage = getDmMessage(role.name, member.user.id, config);
      const dmEmbed = new EmbedBuilder()
        .setColor(role.color || 0x57f287)
        .setTitle(`🎖️ ¡Nuevo rango en ${guild.name}!`)
        .setDescription(dmMessage)
        .setThumbnail(guild.iconURL({ size: 128 }) ?? null)
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`[DarRango] No se pudo enviar DM a ${member.user.tag} (DMs cerrados)`);
    }

    // Confirmación privada al moderador
    const confirmEmbed = new EmbedBuilder()
      .setColor(role.color || 0x57f287)
      .setTitle("🎖️ Rango asignado")
      .setDescription(`${member} ha recibido el rango **${role.name}** correctamente.`)
      .addFields(
        { name: "Usuario", value: `${member.user.tag}`, inline: true },
        { name: "ID", value: member.user.id, inline: true },
        { name: "Rango", value: `${role}`, inline: true },
        { name: "Asignado por", value: interaction.user.tag, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed] });

    // Anuncio público en el canal (si se solicitó)
    const channel = interaction.channel as TextChannel;
    if (anunciar) {
      const announceEmbed = new EmbedBuilder()
        .setColor(role.color || 0x57f287)
        .setTitle(`🎖️ ¡Nuevo rango asignado!`)
        .setDescription(
          `${member} ha recibido el rango ${role}.\n\n` +
          getDmMessage(role.name, member.user.id, config)
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [announceEmbed] }).catch(() => {});
    }

    // Generar transcripción del canal actual
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
      logger.error(`[DarRango] Error generando transcripción: ${err}`);
    }

    // Enviar al canal de logs de verificación
    const logChannelId = (config as any).verificationLogChannelId || "1489032975852241068";
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (!logChannel) {
      logger.warn(`[DarRango] Canal de logs ${logChannelId} no encontrado`);
      return;
    }

    // Mensaje buscable con ID y supa
    const supa = member.nickname || member.user.username;
    await logChannel
      .send(`🔍 ID: \`${member.user.id}\` | Supa: **${supa}** | Tag: ${member.user.tag} | Rango: **${role.name}**`)
      .catch(() => {});

    // Embed de log
    const logEmbed = new EmbedBuilder()
      .setColor(role.color || 0x57f287)
      .setTitle("📋 Registro de rango")
      .addFields(
        { name: "Usuario", value: member.user.tag, inline: true },
        { name: "ID de Discord", value: `\`${member.user.id}\``, inline: true },
        { name: "Rango asignado", value: `${role}`, inline: true },
        { name: "Asignado por", value: interaction.user.tag, inline: true },
        { name: "Canal", value: `<#${channel.id}>`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    if (!htmlContent) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      return;
    }

    const buf = Buffer.from(htmlContent, "utf-8");
    const attachment = new AttachmentBuilder(buf, { name: `rango-${member.user.id}.html` });

    const logMsg = await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch((err) => {
      logger.error(`[DarRango] Error enviando log: ${err}`);
      return null;
    });

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
