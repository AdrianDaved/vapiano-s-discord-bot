import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import prisma from "../../../database/client";
import { moduleColor, formatDuration, parseDuration, getGuildConfig, sendModLog } from "../../utils";

export default {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Comandos de moderación")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("advertir")
        .setDescription("Advertir a un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón de la advertencia").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("advertencias")
        .setDescription("Ver advertencias de un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a consultar").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("limpiar-advertencias")
        .setDescription("Borrar todas las advertencias de un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a limpiar").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("silenciar")
        .setDescription("Silenciar a un usuario (timeout)")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a silenciar").setRequired(true))
        .addStringOption((opt) => opt.setName("duracion").setDescription("Duración (ej. 1h, 30m, 1d)").setRequired(true))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("desilenciar")
        .setDescription("Quitar silencio a un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a desilenciar").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("expulsar")
        .setDescription("Expulsar a un usuario del servidor")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a expulsar").setRequired(true))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("banear")
        .setDescription("Banear a un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a banear").setRequired(true))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón").setRequired(false))
        .addIntegerOption((opt) => opt.setName("dias").setDescription("Días de mensajes a eliminar (0-7)").setMinValue(0).setMaxValue(7))
        .addChannelOption((opt) => opt.setName("canal").setDescription("Canal donde publicar el cartel de ban (por defecto: canal de bans)").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban-temporal")
        .setDescription("Banear temporalmente a un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a banear temporalmente").setRequired(true))
        .addStringOption((opt) => opt.setName("duracion").setDescription("Duración (ej. 1d, 1w)").setRequired(true))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("desbanear")
        .setDescription("Desbanear a un usuario")
        .addStringOption((opt) => opt.setName("userid").setDescription("ID del usuario a desbanear").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("bloquear")
        .setDescription("Bloquear un canal (impedir envío de mensajes)")
        .addChannelOption((opt) => opt.setName("canal").setDescription("Canal a bloquear"))
        .addStringOption((opt) => opt.setName("razon").setDescription("Razón"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("desbloquear")
        .setDescription("Desbloquear un canal")
        .addChannelOption((opt) => opt.setName("canal").setDescription("Canal a desbloquear"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("historial")
        .setDescription("Ver historial de moderación de un usuario")
        .addUserOption((opt) => opt.setName("usuario").setDescription("Usuario a consultar").setRequired(true))
    ),
  module: "moderation",
  cooldown: 3,
  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const config = await getGuildConfig(guildId);

    switch (sub) {
      case "advertir": {
        const user = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("razon") || "Sin razón proporcionada";

        if (user.id === interaction.user.id) {
          await interaction.reply({ content: "No puedes advertirte a ti mismo.", ephemeral: true });
          return;
        }

        await prisma.warning.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, reason },
        });

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: "warn", reason },
        });

        const warnCount = await prisma.warning.count({ where: { guildId, userId: user.id } });

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Usuario Advertido")
          .addFields(
            { name: "Usuario", value: `${user.username} (<@${user.id}>)`, inline: true },
            { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Razón", value: reason },
            { name: "Total de Advertencias", value: warnCount.toString(), inline: true },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        try {
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle(`Fuiste advertido en ${interaction.guild!.name}`)
                .addFields({ name: "Razón", value: reason })
                .setTimestamp(),
            ],
          });
        } catch {
          // DMs cerrados
        }

        await sendModLog(interaction, config, embed);
        break;
      }

      case "advertencias": {
        const user = interaction.options.getUser("usuario", true);
        const warnings = await prisma.warning.findMany({
          where: { guildId, userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        if (warnings.length === 0) {
          await interaction.reply({ content: `${user.username} no tiene advertencias.`, ephemeral: true });
          return;
        }

        const lines = warnings.map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\n   Por <@${w.moderatorId}> — <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`,
        );

        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle(`Advertencias de ${user.username}`)
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: `${warnings.length} advertencia(s) en total` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }

      case "limpiar-advertencias": {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: "Solo los administradores pueden borrar advertencias.", ephemeral: true });
          return;
        }

        const user = interaction.options.getUser("usuario", true);
        const deleted = await prisma.warning.deleteMany({ where: { guildId, userId: user.id } });

        await interaction.reply({
          content: `Se borraron **${deleted.count}** advertencia(s) de ${user.username}.`,
          ephemeral: true,
        });
        break;
      }

      case "silenciar": {
        const user = interaction.options.getUser("usuario", true);
        const durationStr = interaction.options.getString("duracion", true);
        const reason = interaction.options.getString("razon") || "Sin razón proporcionada";
        const durationSec = parseDuration(durationStr);

        if (!durationSec || durationSec < 1) {
          await interaction.reply({ content: "Duración inválida. Usa formatos como `1h`, `30m`, `1d`.", ephemeral: true });
          return;
        }

        if (durationSec > 28 * 86400) {
          await interaction.reply({ content: "La duración máxima del silencio es de 28 días.", ephemeral: true });
          return;
        }

        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: "Usuario no encontrado en este servidor.", ephemeral: true });
          return;
        }

        if (!member.moderatable) {
          await interaction.reply({ content: "No puedo silenciar a este usuario (jerarquía de roles).", ephemeral: true });
          return;
        }

        await member.timeout(durationSec * 1000, reason);

        await prisma.modAction.create({
          data: {
            guildId,
            userId: user.id,
            moderatorId: interaction.user.id,
            action: "tempmute",
            reason,
            duration: durationSec,
            expiresAt: new Date(Date.now() + durationSec * 1000),
          },
        });

        const embed = new EmbedBuilder()
          .setColor(0xf47b67)
          .setTitle("Usuario Silenciado")
          .addFields(
            { name: "Usuario", value: `${user.username} (<@${user.id}>)`, inline: true },
            { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Duración", value: formatDuration(durationSec), inline: true },
            { name: "Razón", value: reason },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case "desilenciar": {
        const user = interaction.options.getUser("usuario", true);
        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: "Usuario no encontrado en este servidor.", ephemeral: true });
          return;
        }

        await member.timeout(null, `Desilenciado por ${interaction.user.username}`);

        if (config.muteRoleId && member.roles.cache.has(config.muteRoleId)) {
          await member.roles.remove(config.muteRoleId).catch(() => {});
        }

        await prisma.modAction.updateMany({
          where: { guildId, userId: user.id, action: { in: ["tempmute", "mute"] }, active: true },
          data: { active: false },
        });

        await interaction.reply({ content: `<@${user.id}> ha sido desilenciado.` });
        break;
      }

      case "expulsar": {
        const user = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("razon") || "Sin razón proporcionada";

        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
          await interaction.reply({ content: "Usuario no encontrado en este servidor.", ephemeral: true });
          return;
        }

        if (!member.kickable) {
          await interaction.reply({ content: "No puedo expulsar a este usuario (jerarquía de roles).", ephemeral: true });
          return;
        }

        try {
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle(`Fuiste expulsado de ${interaction.guild!.name}`)
                .addFields({ name: "Razón", value: reason })
                .setTimestamp(),
            ],
          });
        } catch {
          // DMs cerrados
        }

        await member.kick(reason);

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: "kick", reason },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Usuario Expulsado")
          .addFields(
            { name: "Usuario", value: `${user.username} (${user.id})`, inline: true },
            { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Razón", value: reason },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case "banear": {
        const user = interaction.options.getUser("usuario", true);
        const reason = interaction.options.getString("razon") || "Sin razón proporcionada";
        const days = interaction.options.getInteger("dias") ?? 0;

        const member = interaction.guild!.members.cache.get(user.id);
        if (member && !member.bannable) {
          await interaction.reply({ content: "No puedo banear a este usuario (jerarquía de roles).", ephemeral: true });
          return;
        }

        try {
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle(`Fuiste baneado de ${interaction.guild!.name}`)
                .addFields({ name: "Razón", value: reason })
                .setTimestamp(),
            ],
          });
        } catch {
          // DMs cerrados
        }

        await interaction.guild!.members.ban(user.id, {
          reason,
          deleteMessageSeconds: days * 86400,
        });

        await prisma.modAction.create({
          data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: "ban", reason },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({
            name: interaction.guild!.name,
            iconURL: interaction.guild!.iconURL({ size: 64 }) ?? undefined,
          })
          .setTitle("🚨 USUARIO BANEADO")
          .setDescription(`**${user.username}** ha sido expulsado permanentemente del servidor.`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "👤 Usuario", value: `<@${user.id}> \`${user.username}\``, inline: true },
            { name: "🛡️ Moderador", value: `<@${interaction.user.id}>`, inline: true },
            { name: "\u200b", value: "\u200b", inline: true },
            { name: "📋 Razón", value: `\`\`\`${reason}\`\`\`` },
          )
          .setFooter({ text: `ID del usuario: ${user.id}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);

        const DEFAULT_BAN_CHANNEL_ID = "1482938839084306482";
        const banChannelOption = interaction.options.getChannel("canal");
        const banChannelId = banChannelOption ? banChannelOption.id : DEFAULT_BAN_CHANNEL_ID;
        try {
          const banChannel = await interaction.guild!.channels.fetch(banChannelId) as TextChannel;
          if (banChannel && banChannel.isTextBased()) {
            await banChannel.send({ embeds: [embed] });
          }
        } catch {
          // Canal no encontrado o sin permisos
        }
        break;
      }

      case "ban-temporal": {
        const user = interaction.options.getUser("usuario", true);
        const durationStr = interaction.options.getString("duracion", true);
        const reason = interaction.options.getString("razon") || "Sin razón proporcionada";
        const durationSec = parseDuration(durationStr);

        if (!durationSec) {
          await interaction.reply({ content: "Duración inválida.", ephemeral: true });
          return;
        }

        const member = interaction.guild!.members.cache.get(user.id);
        if (member && !member.bannable) {
          await interaction.reply({ content: "No puedo banear a este usuario.", ephemeral: true });
          return;
        }

        await interaction.guild!.members.ban(user.id, { reason: `Ban temporal: ${reason}` });

        await prisma.modAction.create({
          data: {
            guildId,
            userId: user.id,
            moderatorId: interaction.user.id,
            action: "tempban",
            reason,
            duration: durationSec,
            expiresAt: new Date(Date.now() + durationSec * 1000),
          },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Usuario Baneado Temporalmente")
          .addFields(
            { name: "Usuario", value: `${user.username} (${user.id})`, inline: true },
            { name: "Duración", value: formatDuration(durationSec), inline: true },
            { name: "Razón", value: reason },
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await sendModLog(interaction, config, embed);
        break;
      }

      case "desbanear": {
        const userId = interaction.options.getString("userid", true);

        try {
          await interaction.guild!.bans.remove(userId, `Desbaneado por ${interaction.user.username}`);
          await prisma.modAction.updateMany({
            where: { guildId, userId, action: { in: ["ban", "tempban"] }, active: true },
            data: { active: false },
          });
          await interaction.reply({ content: `El usuario \`${userId}\` ha sido desbaneado.` });
        } catch {
          await interaction.reply({ content: "No se pudo desbanear a ese usuario. Verifica que el ID sea correcto.", ephemeral: true });
        }
        break;
      }

      case "bloquear": {
        const channel = (interaction.options.getChannel("canal") || interaction.channel) as TextChannel;
        const reason = interaction.options.getString("razon") || "Canal bloqueado por un moderador";

        await channel.permissionOverwrites.edit(guildId, { SendMessages: false });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("🔒 Canal Bloqueado")
          .setDescription(`Este canal ha sido bloqueado.\n**Razón:** ${reason}`)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `<#${channel.id}> ha sido bloqueado.`, ephemeral: true });
        break;
      }

      case "desbloquear": {
        const channel = (interaction.options.getChannel("canal") || interaction.channel) as TextChannel;

        await channel.permissionOverwrites.edit(guildId, { SendMessages: null });

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("🔓 Canal Desbloqueado")
          .setDescription("Este canal ha sido desbloqueado.")
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `<#${channel.id}> ha sido desbloqueado.`, ephemeral: true });
        break;
      }

      case "historial": {
        const user = interaction.options.getUser("usuario", true);
        const actions = await prisma.modAction.findMany({
          where: { guildId, userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 15,
        });

        if (actions.length === 0) {
          await interaction.reply({ content: `No hay historial de moderación para ${user.username}.`, ephemeral: true });
          return;
        }

        const actionEmojis: Record<string, string> = {
          warn: "⚠️", mute: "🔇", tempmute: "🔇", kick: "👢",
          ban: "🔨", tempban: "🔨", unmute: "🔊", unban: "✅",
        };

        const actionNames: Record<string, string> = {
          warn: "ADVERTENCIA", mute: "SILENCIO", tempmute: "SILENCIO TEMPORAL",
          kick: "EXPULSIÓN", ban: "BAN", tempban: "BAN TEMPORAL",
          unmute: "DESILENCIADO", unban: "DESBAN",
        };

        const lines = actions.map((a) => {
          const emoji = actionEmojis[a.action] || "📋";
          return `${emoji} **${actionNames[a.action] || a.action.toUpperCase()}** — ${a.reason}\nPor <@${a.moderatorId}> — <t:${Math.floor(a.createdAt.getTime() / 1000)}:R>${a.active ? " (activo)" : ""}`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor("moderation"))
          .setTitle(`Historial de Moderación: ${user.username}`)
          .setDescription(lines.join("\n\n"))
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  },
};
