import { EmbedBuilder } from 'discord.js';
import { MessageHandler } from './pipeline';
import { moduleColor } from '../../utils';
import { getGlobalRep } from '../reputation/globalRep';
import prisma from '../../../database/client';

const REP_PREFIX = '+rep';
const MENTION_PATTERN = /<@!?\d+>/;

/**
 * `+rep @user [reason]` text command. Lives here (rather than as a slash
 * command) because the user wanted a frictionless legacy command.
 */
export const repHandler: MessageHandler = {
  name: 'rep',
  async handle({ message, config }) {
    if (!config.reputationEnabled) return;
    if (!message.content.startsWith(REP_PREFIX)) return;

    const target = message.mentions.users.first();
    if (!target) return;

    if (target.id === message.author.id) {
      await message.reply({ content: 'No puedes darte reputación a ti mismo.' });
      return;
    }
    if (target.bot) {
      await message.reply({ content: 'No puedes dar reputación a bots.' });
      return;
    }

    const args = message.content.slice(REP_PREFIX.length).trim();
    const reason = args.replace(MENTION_PATTERN, '').trim() || null;

    await prisma.reputation.create({
      data: {
        guildId: message.guild!.id,
        userId: target.id,
        giverId: message.author.id,
        reason,
      },
    });

    const totalRep = await getGlobalRep(target.id);

    const embed = new EmbedBuilder()
      .setColor(moduleColor('reputation'))
      .setDescription(`${message.author} dio **+1 rep** a ${target}${reason ? `\nRazón: ${reason}` : ''}`)
      .setFooter({ text: `${target.username} ahora tiene ${totalRep} rep` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
