import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('invitaciones')
    .setDescription('Comandos de seguimiento de invitaciones')
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Ver estadísticas de invitaciones de un usuario')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('ranking').setDescription('Ver el ranking de invitaciones')
    )
    .addSubcommand((sub) =>
      sub
        .setName('quien')
        .setDescription('Ver quién invitó a un usuario específico')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reiniciar')
        .setDescription('Reiniciar datos de invitaciones de un usuario (solo admins)')
        .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario a reiniciar').setRequired(true))
    ),
  module: 'invites',
  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case 'info': {
        const user = interaction.options.getUser('usuario') || interaction.user;

        const [total, fakes, leaves] = await Promise.all([
          prisma.invite.count({ where: { guildId, inviterId: user.id } }),
          prisma.invite.count({ where: { guildId, inviterId: user.id, fake: true } }),
          prisma.invite.count({ where: { guildId, inviterId: user.id, left: true } }),
        ]);

        const valid = total - fakes - leaves;

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setAuthor({ name: `Invitaciones de ${user.username}`, iconURL: user.displayAvatarURL() })
          .addFields(
            { name: 'Total', value: valid.toString(), inline: true },
            { name: 'Regulares', value: (total - fakes).toString(), inline: true },
            { name: 'Falsas', value: fakes.toString(), inline: true },
            { name: 'Se fueron', value: leaves.toString(), inline: true }
          )
          .setFooter({ text: `Invitaciones válidas = Total - Falsas - Se fueron` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'ranking': {
        const inviterStats = await prisma.invite.groupBy({
          by: ['inviterId'],
          where: { guildId, fake: false, left: false },
          _count: { inviterId: true },
          orderBy: { _count: { inviterId: 'desc' } },
          take: 15,
        });

        if (inviterStats.length === 0) {
          await interaction.reply({ content: 'Aún no hay datos de invitaciones.', flags: 64 });
          return;
        }

        const lines = await Promise.all(
          inviterStats.map(async (stat, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
            return `${medal} <@${stat.inviterId}> — **${stat._count.inviterId}** invitaciones`;
          })
        );

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setTitle('Ranking de Invitaciones')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${interaction.guild?.name}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'quien': {
        const user = interaction.options.getUser('usuario', true);

        const inviteRecord = await prisma.invite.findFirst({
          where: { guildId, invitedId: user.id },
          orderBy: { createdAt: 'desc' },
        });

        if (!inviteRecord) {
          await interaction.reply({
            content: `No se pudo determinar quién invitó a **${user.username}**. Puede que se haya unido por una URL de vanidad o que no se rastrearon los datos de invitación.`,
            flags: 64,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(moduleColor('invites'))
          .setDescription(
            `**${user.username}** fue invitado por <@${inviteRecord.inviterId}> usando el código \`${inviteRecord.code}\`${inviteRecord.fake ? ' ⚠️ (marcada como falsa)' : ''}${inviteRecord.left ? ' (ya se fue)' : ''}`
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'reiniciar': {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: 'Solo los administradores pueden reiniciar datos de invitaciones.', flags: 64 });
          return;
        }

        const user = interaction.options.getUser('usuario', true);
        const deleted = await prisma.invite.deleteMany({
          where: { guildId, inviterId: user.id },
        });

        await interaction.reply({
          content: `Se reiniciaron **${deleted.count}** registros de invitación de ${user.username}.`,
          flags: 64,
        });
        break;
      }
    }
  },
};
