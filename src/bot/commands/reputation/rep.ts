/**
 * /rep @usuario [razon] — Dar reputación directamente (atajo).
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import prisma from '../../../database/client';
import { moduleColor, getGuildConfig } from '../../utils';

const DEFAULT_REP_CHANNEL_ID = '1420875609554292836';

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
    const target = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('razon');

    // Verificar canal permitido
    const config = await getGuildConfig(guildId);
    const allowedChannelId = config.repChannelId || DEFAULT_REP_CHANNEL_ID;
    if (interaction.channelId !== allowedChannelId) {
      await interaction.reply({
        content: `Las reputaciones solo se pueden dar en <#${allowedChannelId}>.`,
        ephemeral: true,
      });
      const repChannel = interaction.guild?.channels.cache.get(allowedChannelId);
      if (repChannel?.isTextBased()) {
        await (repChannel as import('discord.js').TextChannel).send(
          `${interaction.user}, las reputaciones van aquí. Usa \`/rep\` en este canal.`
        ).catch(() => {});
      }
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'No puedes darte reputación a ti mismo.', ephemeral: true });
      return;
    }

    if (target.bot) {
      await interaction.reply({ content: 'No puedes dar reputación a bots.', ephemeral: true });
      return;
    }

    await prisma.reputation.create({
      data: { guildId, userId: target.id, giverId: interaction.user.id, reason: reason || null },
    });

    const totalRep = await prisma.reputation.count({ where: { guildId, userId: target.id } });

    const embed = new EmbedBuilder()
      .setColor(moduleColor('reputation'))
      .setDescription(`${interaction.user} dio **+1 rep** a ${target}${reason ? `\n**Razón:** ${reason}` : ''}`)
      .setFooter({ text: `${target.username} ahora tiene ${totalRep} rep` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
