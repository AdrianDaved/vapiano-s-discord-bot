import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import prisma from "../../../database/client";
import { getGuildConfig } from "../../utils";
import { pendingBans } from "../../modules/moderation/pendingBans";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banear a un usuario del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a banear").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razon").setDescription("Razón del ban").setRequired(true)
    ),
  module: "moderation",
  cooldown: 3,
  permissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("usuario", true);
    const reason = interaction.options.getString("razon", true);
    const guildId = interaction.guildId!;

    const member = interaction.guild!.members.cache.get(user.id);
    if (member && !member.bannable) {
      await interaction.reply({ content: "No puedo banear a este usuario (jerarquía de roles).", flags: 64 });
      return;
    }

    // DM al usuario antes de banear
    try {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(`Has sido baneado de ${interaction.guild!.name}`)
            .addFields({ name: "Razón", value: reason })
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs cerrados
    }

    // Register before banning so guildBanAdd can attribute the correct moderator and log it
    pendingBans.set(user.id, { guildId: interaction.guildId!, moderatorId: interaction.user.id, reason });
    setTimeout(() => pendingBans.delete(user.id), 10_000);

    await interaction.guild!.members.ban(user.id, { reason });

    await prisma.modAction.create({
      data: { guildId, userId: user.id, moderatorId: interaction.user.id, action: "ban", reason },
    });

    // Simple confirmation — the full log embed is sent by guildBanAdd event
    await interaction.reply({
      content: `✅ **${user.username}** ha sido baneado. Razón: \`${reason}\``,
      flags: 64,
    });
  },
};
