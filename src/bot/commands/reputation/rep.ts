import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, getGuildConfig } from '../../utils';
import { getGlobalRep, LINKED_GUILD_IDS } from '../../modules/reputation/globalRep';

export default {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Dar reputación a un usuario')
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Usuario al que dar rep').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('razon').setDescription('Razón para dar rep').setRequired(false)
    ),
  module: 'reputation',
  cooldown: 3,

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const target  = interaction.options.getUser('usuario', true);
    const reason  = interaction.options.getString('razon');

    const config = await getGuildConfig(guildId);
    if (config.repChannelId && interaction.channelId !== config.repChannelId) {
      await interaction.reply({
        content: `Las reputaciones solo se pueden dar en <#${config.repChannelId}>.`,
        flags: 64,
      });
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'No puedes darte reputación a ti mismo.', flags: 64 });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: 'No puedes dar reputación a bots.', flags: 64 });
      return;
    }

    await prisma.reputation.create({
      data: { guildId, userId: target.id, giverId: interaction.user.id, reason: reason || null },
    });

    // Rep global sincronizada (suma de ambos servidores)
    const totalRep = await getGlobalRep(target.id);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('reputation'))
      .setDescription(`${interaction.user} dio **+1 rep** a ${target}${reason ? `\n**Razón:** ${reason}` : ''}`)
      .setFooter({ text: `${target.username} tiene ${totalRep} rep en total (Vapiano + HubStore)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
