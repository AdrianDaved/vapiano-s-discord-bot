import { Client, TextChannel } from 'discord.js';
import * as cron from 'node-cron';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';
import { registerInterval } from '../timerRegistry';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

/**
 * Initialize the scheduled message processor. Loads all enabled scheduled
 * messages from the database and registers cron jobs.
 */
export function initScheduler(client: Client): void {
  loadAllScheduledMessages(client);

  // Re-sync every 5 minutes to pick up dashboard changes
  registerInterval(() => {
    loadAllScheduledMessages(client);
  }, 5 * 60_000);

  logger.info('[Scheduler] Scheduled message processor started');
}

async function loadAllScheduledMessages(client: Client): Promise<void> {
  try {
    const messages = await prisma.scheduledMessage.findMany({
      where: { enabled: true },
    });

    // Stop jobs that are no longer in the database
    for (const [id, job] of scheduledJobs.entries()) {
      if (!messages.find((m) => m.id === id)) {
        job.stop();
        scheduledJobs.delete(id);
      }
    }

    for (const msg of messages) {
      // Skip if already running with the same cron
      if (scheduledJobs.has(msg.id)) continue;

      if (!cron.validate(msg.cron)) {
        logger.warn(`[Scheduler] Invalid cron expression for message ${msg.id}: ${msg.cron}`);
        continue;
      }

      const job = cron.schedule(msg.cron, async () => {
        try {
          const guild = client.guilds.cache.get(msg.guildId);
          if (!guild) return;

          const channel = guild.channels.cache.get(msg.channelId) as TextChannel;
          if (!channel) return;

          await channel.send(msg.message);

          await prisma.scheduledMessage.update({
            where: { id: msg.id },
            data: { lastRun: new Date() },
          });
        } catch (err) {
          logger.error(`[Scheduler] Error sending scheduled message ${msg.id}: ${err}`);
        }
      });

      scheduledJobs.set(msg.id, job);
    }
  } catch (err) {
    logger.error(`[Scheduler] Error loading scheduled messages: ${err}`);
  }
}

/**
 * Register or update a single scheduled message job.
 */
export function registerScheduledJob(id: string, cronExpr: string, client: Client): void {
  // Stop existing job if any
  const existing = scheduledJobs.get(id);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(id);
  }

  if (!cron.validate(cronExpr)) return;

  const job = cron.schedule(cronExpr, async () => {
    try {
      const msg = await prisma.scheduledMessage.findUnique({ where: { id } });
      if (!msg || !msg.enabled) {
        job.stop();
        scheduledJobs.delete(id);
        return;
      }

      const guild = client.guilds.cache.get(msg.guildId);
      if (!guild) return;

      const channel = guild.channels.cache.get(msg.channelId) as TextChannel;
      if (!channel) return;

      await channel.send(msg.message);
      await prisma.scheduledMessage.update({
        where: { id },
        data: { lastRun: new Date() },
      });
    } catch (err) {
      logger.error(`[Scheduler] Error in job ${id}: ${err}`);
    }
  });

  scheduledJobs.set(id, job);
}

/**
 * Stop a scheduled job by ID.
 */
export function stopScheduledJob(id: string): void {
  const job = scheduledJobs.get(id);
  if (job) {
    job.stop();
    scheduledJobs.delete(id);
  }
}
