import { Client, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Initialize the giveaway timer that checks for ended giveaways every 15 seconds.
 */
export function initGiveawayTimer(client: Client) {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredGiveaways = await prisma.giveaway.findMany({
        where: {
          ended: false,
          endsAt: { lte: now },
        },
      });

      for (const giveaway of expiredGiveaways) {
        try {
          // Pick winners
          const winners = pickWinners(giveaway.entries, giveaway.winners);

          await prisma.giveaway.update({
            where: { id: giveaway.id },
            data: { ended: true, winnerIds: winners },
          });

          // Update the giveaway message
          const guild = client.guilds.cache.get(giveaway.guildId);
          if (!guild) continue;

          const channel = guild.channels.cache.get(giveaway.channelId) as TextChannel;
          if (!channel) continue;

          if (!giveaway.messageId) continue;

          try {
            const msg = await channel.messages.fetch(giveaway.messageId);

            const winnersText = winners.length > 0
              ? winners.map((w) => `<@${w}>`).join(', ')
              : 'No hay participaciones validas.';

            const embed = new EmbedBuilder()
              .setColor(0x99aab5)
              .setTitle('🎉 SORTEO FINALIZADO 🎉')
              .setDescription(
                `**${giveaway.prize}**\n\n` +
                `**Ganador(es):** ${winnersText}\n` +
                `**Organizado por:** <@${giveaway.hostId}>\n` +
                `**Participaciones:** ${giveaway.entries.length}`
              )
              .setFooter({ text: `Finalizado` })
              .setTimestamp();

            await msg.edit({ embeds: [embed], components: [] });

            if (winners.length > 0) {
              await channel.send(
                `🎉 Felicidades ${winnersText}! Ganaste **${giveaway.prize}**!`
              );
            } else {
              await channel.send(`El sorteo de **${giveaway.prize}** termino sin participaciones.`);
            }
          } catch {
            // Message may have been deleted
          }

          logger.info(`[Giveaway] Ended giveaway ${giveaway.id} — ${giveaway.prize}`);
        } catch (err) {
          logger.error(`[Giveaway] Error ending giveaway ${giveaway.id}: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`[Giveaway] Timer error: ${err}`);
    }
  }, 15_000); // Check every 15 seconds

  logger.info('[Giveaway] Timer initialized');
}

/** Pick random winners from entries */
function pickWinners(entries: string[], count: number): string[] {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Handle giveaway button interactions
 */
export async function handleGiveawayButton(
  interaction: import('discord.js').ButtonInteraction
) {
  const customId = interaction.customId;

  if (customId === 'giveaway_enter') {
    const messageId = interaction.message.id;

    const giveaway = await prisma.giveaway.findFirst({
      where: { messageId, ended: false },
    });

    if (!giveaway) {
      await interaction.reply({ content: 'Este sorteo ya termino.', ephemeral: true });
      return;
    }

    // Toggle entry
    const userId = interaction.user.id;
    const entries = [...giveaway.entries];
    const alreadyEntered = entries.includes(userId);

    if (alreadyEntered) {
      // Remove entry
      const idx = entries.indexOf(userId);
      entries.splice(idx, 1);

      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { entries },
      });

      // Update button count
      await updateEntryCount(interaction, entries.length);
      await interaction.reply({ content: 'Has salido del sorteo.', ephemeral: true });
    } else {
      // Add entry
      entries.push(userId);

      await prisma.giveaway.update({
        where: { id: giveaway.id },
        data: { entries },
      });

      await updateEntryCount(interaction, entries.length);
      await interaction.reply({ content: '🎉 Te has unido al sorteo! Buena suerte!', ephemeral: true });
    }
  }
}

async function updateEntryCount(interaction: import('discord.js').ButtonInteraction, count: number) {
  try {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('🎉 Participar en sorteo')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('giveaway_count')
        .setLabel(`${count} participaciones`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );

    await interaction.message.edit({ components: [row] });
  } catch {
    // Ignore edit failures
  }
}
