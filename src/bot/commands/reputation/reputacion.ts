import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';
import {
  getGlobalRep, getGlobalGiven, getGlobalRanking, getGlobalRank,
  getGlobalHistory, LINKED_GUILD_IDS,
} from '../../modules/reputation/globalRep';

export default {
  data: new SlashCommandBuilder()
    .setName('reputacion')
    .setDescription('Gestionar reputación')
    .addSubcommand((sub) =>
      sub.setName('ver').setDescription('Ver la reputación de un usuario')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) => sub.setName('ranking').setDescription('Ver el ranking global de reputación'))
    .addSubcommand((sub) =>
      sub.setName('historial').setDescription('Ver rep reciente dada/recibida')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('quitar').setDescription('Quitar reputación a un usuario (solo mods)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario al que quitar rep').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('cantidad').setDescription('Cantidad a quitar (por defecto: 1)').setRequired(false).setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('reiniciar').setDescription('Reiniciar toda la reputación de un usuario (solo admins)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a reiniciar').setRequired(true))
    ),
  module: 'reputation',

  async execute(interaction: ChatInputCommandInteraction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'ver': {
        const user = interaction.options.getUser('usuario') || interaction.user;

        const [totalRep, givenRep, rank, vapRep, hubRep] = await Promise.all([
          getGlobalRep(user.id),
          getGlobalGiven(user.id),
          getGlobalRank(user.id),
          prisma.reputation.count({ where: { userId: user.id, guildId: '1420045220325625898' } }),
          prisma.reputation.count({ where: { userId: user.id, guildId: '1107335281620820079' } }),
        ]);

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: '⭐ Rep Total', value: `**${totalRep}**`, inline: true },
            { name: '🏆 Posición Global', value: rank > 0 ? `#${rank}` : 'Sin ranking', inline: true },
            { name: '📤 Rep Dada', value: `${givenRep}`, inline: true },
            { name: '🟦 Vapiano', value: `${vapRep} rep`, inline: true },
            { name: '🟥 HubStore', value: `${hubRep} rep`, inline: true },
          )
          .setFooter({ text: 'Reputación sincronizada entre Vapiano y HubStore' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'ranking': {
        const topUsers = await getGlobalRanking(15);

        if (topUsers.length === 0) {
          await interaction.reply({ content: 'Aún no hay datos de reputación.', flags: 64 });
          return;
        }

        const lines = topUsers.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} <@${u.userId}> — **${u.total}** rep`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle('🏆 Ranking Global de Reputación')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Reputación combinada de Vapiano + HubStore' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'historial': {
        const user   = interaction.options.getUser('usuario') || interaction.user;
        const recent = await getGlobalHistory(user.id, 10);

        if (recent.length === 0) {
          await interaction.reply({ content: 'No se encontró historial de reputación.', flags: 64 });
          return;
        }

        const GUILD_NAMES: Record<string, string> = {
          '1420045220325625898': 'Vapiano',
          '1107335281620820079': 'HubStore',
        };

        const lines = recent.map((r) => {
          const time      = `<t:${Math.floor(r.createdAt.getTime() / 1000)}:R>`;
          const server    = GUILD_NAMES[r.guildId] ?? r.guildId;
          const reasonStr = r.reason ? ` — *${r.reason}*` : '';
          return r.userId === user.id
            ? `${time} \`[${server}]\` Recibida de <@${r.giverId}>${reasonStr}`
            : `${time} \`[${server}]\` Dada a <@${r.userId}>${reasonStr}`;
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('reputation'))
          .setTitle(`Historial Global de Rep — ${user.username}`)
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Historial combinado de Vapiano + HubStore' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'quitar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
          await interaction.reply({ content: 'Necesitas el permiso **Moderar Miembros**.', flags: 64 });
          return;
        }

        const target = interaction.options.getUser('usuario', true);
        const amount = interaction.options.getInteger('cantidad') || 1;

        // Quitar del servidor actual primero, luego del otro si hace falta
        const reps = await prisma.reputation.findMany({
          where: { guildId: { in: LINKED_GUILD_IDS }, userId: target.id },
          orderBy: { createdAt: 'desc' },
          take: amount,
          select: { id: true },
        });

        if (reps.length === 0) {
          await interaction.reply({ content: `${target.username} no tiene reputación que quitar.`, flags: 64 });
          return;
        }

        await prisma.reputation.deleteMany({ where: { id: { in: reps.map((r) => r.id) } } });
        const remaining = await getGlobalRep(target.id);

        await interaction.reply({
          content: `Se quitaron **${reps.length}** rep a **${target.username}**. Ahora tiene **${remaining}** rep en total.`,
          flags: 64,
        });
        break;
      }

      case 'reiniciar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Solo los administradores pueden reiniciar la reputación.', flags: 64 });
          return;
        }

        const target  = interaction.options.getUser('usuario', true);
        const deleted = await prisma.reputation.deleteMany({
          where: { guildId: { in: LINKED_GUILD_IDS }, userId: target.id },
        });

        await interaction.reply({
          content: `Se reinició toda la reputación global de **${target.username}** (${deleted.count} rep eliminada de ambos servidores).`,
          flags: 64,
        });
        break;
      }
    }
  },
};
