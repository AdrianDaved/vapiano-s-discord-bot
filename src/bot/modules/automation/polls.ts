import { ButtonInteraction, EmbedBuilder, Client, TextChannel } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Initialize the poll auto-end timer. Checks every 30 seconds for expired polls.
 */
export function initPollTimer(client: Client) {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredPolls = await prisma.poll.findMany({
        where: {
          ended: false,
          endsAt: { lte: now },
        },
      });

      for (const poll of expiredPolls) {
        try {
          await prisma.poll.update({
            where: { id: poll.id },
            data: { ended: true },
          });

          const votes: Record<string, string[]> = (poll.votes as any) || {};
          const totalVotes = Object.values(votes).reduce((sum, arr) => sum + arr.length, 0);

          // Find winner
          let maxVotes = 0;
          let winnerIdx = 0;
          for (let i = 0; i < poll.options.length; i++) {
            const count = (votes[i.toString()] || []).length;
            if (count > maxVotes) {
              maxVotes = count;
              winnerIdx = i;
            }
          }

          const description = poll.options
            .map((option: string, i: number) => {
              const count = (votes[i.toString()] || []).length;
              const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const bar = createBar(percentage);
              return `**${i + 1}.** ${option}\n${bar} ${count} votes (${percentage}%)`;
            })
            .join('\n\n');

          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`📊 ${poll.question} (ENDED)`)
            .setDescription(
              `${description}\n\n🏆 **Winner: ${poll.options[winnerIdx]}** with ${maxVotes} vote(s)`
            )
            .setFooter({ text: `Total votes: ${totalVotes} | Poll ended` })
            .setTimestamp();

          // Update original message
          const guild = client.guilds.cache.get(poll.guildId);
          if (!guild) continue;

          const channel = guild.channels.cache.get(poll.channelId) as TextChannel;
          if (!channel || !poll.messageId) continue;

          try {
            const msg = await channel.messages.fetch(poll.messageId);
            await msg.edit({ embeds: [embed], components: [] });
          } catch {
            // Message may have been deleted
          }

          logger.info(`[Polls] Auto-ended poll ${poll.id} — ${poll.question}`);
        } catch (err) {
          logger.error(`[Polls] Error auto-ending poll ${poll.id}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`[Polls] Timer error: ${err}`);
    }
  }, 30_000); // Check every 30 seconds

  logger.info('[Polls] Auto-end timer initialized');
}

/**
 * Handle a poll vote button click.
 * customId format: poll_<pollId>_<optionIndex>
 */
export async function handlePollVote(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split('_');
  if (parts.length < 3) return;

  const pollId = parts[1];
  const optionIndex = parseInt(parts[2], 10);

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) {
    await interaction.reply({ content: 'This poll no longer exists.', ephemeral: true });
    return;
  }

  if (poll.ended) {
    await interaction.reply({ content: 'This poll has already ended.', ephemeral: true });
    return;
  }

  if (poll.endsAt && new Date() > poll.endsAt) {
    await interaction.reply({ content: 'This poll has expired.', ephemeral: true });
    return;
  }

  // Parse votes
  const votes: Record<string, string[]> = (poll.votes as any) || {};
  const userId = interaction.user.id;

  // Remove previous vote from any option
  for (const key of Object.keys(votes)) {
    votes[key] = (votes[key] || []).filter((id: string) => id !== userId);
  }

  // Add new vote
  const optionKey = optionIndex.toString();
  if (!votes[optionKey]) votes[optionKey] = [];
  votes[optionKey].push(userId);

  // Update database
  await prisma.poll.update({
    where: { id: pollId },
    data: { votes: votes as any },
  });

  // Update the embed with new vote counts
  try {
    const totalVotes = Object.values(votes).reduce((sum, arr) => sum + arr.length, 0);
    const description = poll.options
      .map((option: string, i: number) => {
        const count = (votes[i.toString()] || []).length;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const bar = createBar(percentage);
        return `**${i + 1}.** ${option}\n${bar} ${count} votes (${percentage}%)`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xf47b67)
      .setTitle(`📊 ${poll.question}`)
      .setDescription(description)
      .setFooter({ text: `Total votes: ${totalVotes}${poll.endsAt ? ` | Ends` : ''}` })
      .setTimestamp(poll.endsAt || undefined);

    await interaction.update({ embeds: [embed] });
  } catch (err) {
    logger.error(`[Polls] Error updating poll embed: ${err}`);
    await interaction.reply({ content: 'Your vote has been recorded!', ephemeral: true });
  }
}

/**
 * Create a visual progress bar.
 */
function createBar(percentage: number): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
