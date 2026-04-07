import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor } from '../../utils';

export default {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Establecer o quitar tu estado AFK')
    .addSubcommand((sub) =>
      sub
        .setName('establecer')
        .setDescription('Ponerte como AFK')
        .addStringOption((opt) =>
          opt.setName('razon').setDescription('Razón del AFK').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('quitar').setDescription('Quitar tu estado AFK')
    ),
  cooldown: 5,
  module: 'afk',

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    switch (sub) {
      case 'establecer': {
        const reason = interaction.options.getString('razon') || 'AFK';

        await prisma.afkStatus.upsert({
          where: { guildId_userId: { guildId, userId } },
          create: { guildId, userId, reason },
          update: { reason, createdAt: new Date() },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('afk'))
          .setDescription(`${interaction.user} ahora está AFK: **${reason}**`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'quitar': {
        const deleted = await prisma.afkStatus.deleteMany({
          where: { guildId, userId },
        });

        if (deleted.count === 0) {
          await interaction.reply({ content: 'No estás AFK.', flags: 64 });
          return;
        }

        await interaction.reply({ content: '¡Bienvenido de vuelta! Tu estado AFK ha sido eliminado.', flags: 64 });
        break;
      }
    }
  },
};
