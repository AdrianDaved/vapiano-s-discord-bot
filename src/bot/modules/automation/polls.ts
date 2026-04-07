import { ButtonInteraction, Client, GuildMember, TextChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';
import { registerInterval } from '../timerRegistry';
import { buildPollEmbed } from '../../commands/automation/poll';

export function initPollTimer(client: Client) {
  registerInterval(async () => {
    try {
      const now = new Date();
      const expiredPolls = await prisma.poll.findMany({
        where: { ended: false, endsAt: { lte: now } },
      });

      for (const poll of expiredPolls) {
        try {
          await prisma.poll.update({ where: { id: poll.id }, data: { ended: true } });

          const embed = buildPollEmbed(poll, true);

          const guild = client.guilds.cache.get(poll.guildId);
          if (!guild) continue;
          const channel = guild.channels.cache.get(poll.channelId) as TextChannel;
          if (!channel || !poll.messageId) continue;

          try {
            const msg = await channel.messages.fetch(poll.messageId);
            await msg.edit({ embeds: [embed], components: [] });
          } catch { /* message deleted */ }

          logger.info(`[Polls] Auto-ended poll ${poll.id} — ${poll.question}`);
        } catch (err) {
          logger.error(`[Polls] Error auto-ending poll ${poll.id}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`[Polls] Timer error: ${err}`);
    }
  }, 30_000);

  logger.info('[Polls] Auto-end timer initialized');
}

export async function handlePollVote(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split('_');
  if (parts.length < 3) return;

  const pollId      = parts[1];
  const optionIndex = parseInt(parts[2], 10);

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) {
    await interaction.reply({ content: 'Esta encuesta ya no existe.', flags: 64 });
    return;
  }
  if (poll.ended) {
    await interaction.reply({ content: 'Esta encuesta ya terminó.', flags: 64 });
    return;
  }
  if (poll.endsAt && new Date() > poll.endsAt) {
    await interaction.reply({ content: 'Esta encuesta ha expirado.', flags: 64 });
    return;
  }

  // Role check
  const allowedRoles: string[] = (poll as any).allowedRoleIds ?? [];
  if (allowedRoles.length > 0) {
    const member = interaction.member as GuildMember;
    const memberRoles = member?.roles?.cache;
    const hasRole = memberRoles && allowedRoles.some((rid) => memberRoles.has(rid));
    if (!hasRole) {
      const roleList = allowedRoles.map((id) => `<@&${id}>`).join(', ');
      await interaction.reply({
        content: `❌ Solo pueden votar los miembros con los roles: ${roleList}`,
        flags: 64,
      });
      return;
    }
  }

  const votes: Record<string, string[]> = (poll.votes as any) || {};
  const userId = interaction.user.id;

  // Toggle: if already voted for this option, remove vote
  const alreadyVotedThis = (votes[optionIndex.toString()] || []).includes(userId);

  for (const key of Object.keys(votes)) {
    votes[key] = (votes[key] || []).filter((id: string) => id !== userId);
  }

  if (!alreadyVotedThis) {
    if (!votes[optionIndex.toString()]) votes[optionIndex.toString()] = [];
    votes[optionIndex.toString()].push(userId);
  }

  await prisma.poll.update({ where: { id: pollId }, data: { votes: votes as any } });

  try {
    const updatedPoll = { ...poll, votes, allowedRoleIds: (poll as any).allowedRoleIds };
    const embed = buildPollEmbed(updatedPoll);
    await interaction.update({ embeds: [embed] });
  } catch (err) {
    logger.error(`[Polls] Error updating poll embed: ${err}`);
    await interaction.reply({ content: '✅ Tu voto ha sido registrado.', flags: 64 });
  }
}
