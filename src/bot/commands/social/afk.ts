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
    .setDescription('Set or remove your AFK status')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set yourself as AFK')
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('AFK reason').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('remove').setDescription('Remove your AFK status')
    ),
  cooldown: 5,
  module: 'afk',

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    switch (sub) {
      case 'set': {
        const reason = interaction.options.getString('reason') || 'AFK';

        await prisma.afkStatus.upsert({
          where: { guildId_userId: { guildId, userId } },
          create: { guildId, userId, reason },
          update: { reason, createdAt: new Date() },
        });

        const embed = new EmbedBuilder()
          .setColor(moduleColor('afk'))
          .setDescription(`${interaction.user} is now AFK: **${reason}**`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'remove': {
        const deleted = await prisma.afkStatus.deleteMany({
          where: { guildId, userId },
        });

        if (deleted.count === 0) {
          await interaction.reply({ content: 'You are not AFK.', ephemeral: true });
          return;
        }

        await interaction.reply({ content: 'Welcome back! Your AFK status has been removed.', ephemeral: true });
        break;
      }
    }
  },
};
