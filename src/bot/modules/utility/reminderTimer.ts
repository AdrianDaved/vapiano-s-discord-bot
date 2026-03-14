/**
 * Reminder timer — Checks for due reminders every 15 seconds and sends them.
 */
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';
import { moduleColor } from '../../utils';

let timerRunning = false;

export function initReminderTimer(client: Client) {
  if (timerRunning) return;
  timerRunning = true;

  setInterval(async () => {
    try {
      const dueReminders = await prisma.reminder.findMany({
        where: {
          fired: false,
          remindAt: { lte: new Date() },
        },
        take: 20, // Process in batches
      });

      for (const reminder of dueReminders) {
        try {
          const channel = client.channels.cache.get(reminder.channelId) as TextChannel | undefined;
          if (channel && 'send' in channel) {
            const embed = new EmbedBuilder()
              .setColor(moduleColor('utility'))
              .setTitle('Reminder')
              .setDescription(reminder.message)
              .setFooter({ text: `Set` })
              .setTimestamp(reminder.createdAt);

            await channel.send({
              content: `<@${reminder.userId}>`,
              embeds: [embed],
              allowedMentions: { users: [reminder.userId] },
            });
          }

          // Mark as fired regardless of whether we could send
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { fired: true },
          });
        } catch (err) {
          logger.error(`[Reminders] Failed to deliver reminder ${reminder.id}: ${err}`);
          // Mark as fired to avoid retry loops
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { fired: true },
          });
        }
      }
    } catch (err) {
      logger.error(`[Reminders] Timer error: ${err}`);
    }
  }, 15_000); // Check every 15 seconds

  logger.info('[Reminders] Timer initialized (15s interval)');
}
