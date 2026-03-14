import { Events, ActivityType } from 'discord.js';
import { BotClient, InviteData } from '../../shared/types';
import logger from '../../shared/logger';
import { deployCommands } from '../handlers/commandHandler';
import { initScheduler } from '../modules/automation/scheduler';
import { initPollTimer } from '../modules/automation/polls';
import { initTempActions } from '../modules/moderation/tempActions';
import { initGiveawayTimer } from '../modules/giveaway/giveawayManager';
import { initReminderTimer } from '../modules/utility/reminderTimer';

// Global invite cache: guildId -> Map<code, InviteData>
export const inviteCache = new Map<string, Map<string, InviteData>>();

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: BotClient) {
    logger.info(`Bot logged in as ${client.user?.username}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Deploy slash commands to all guilds (instant, no 1-hour delay)
    await deployCommands(client);

    // Set bot activity
    client.user?.setActivity('/help | Vapiano Bot', { type: ActivityType.Listening });

    // Cache all guild invites for invite tracking
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        const guildInvites = new Map<string, InviteData>();
        invites.forEach((inv) => {
          guildInvites.set(inv.code, {
            code: inv.code,
            uses: inv.uses ?? 0,
            inviterId: inv.inviter?.id ?? null,
          });
        });
        inviteCache.set(guild.id, guildInvites);
      } catch {
        logger.warn(`Could not fetch invites for guild ${guild.name} (${guild.id})`);
      }
    }

    logger.info('Invite cache populated');

    // Start scheduled message processor
    initScheduler(client);

    // Start temp action expiry checker (mutes, bans)
    initTempActions(client);

    // Start giveaway end timer
    initGiveawayTimer(client);

    // Start poll auto-end timer
    initPollTimer(client);

    // Start reminder delivery timer
    initReminderTimer(client);
  },
};
