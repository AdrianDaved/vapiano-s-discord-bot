import { Events, Guild } from 'discord.js';
import { BotClient, InviteData } from '../../shared/types';
import { inviteCache } from './ready';
import { getGuildConfig } from '../utils';
import logger from '../../shared/logger';

export default {
  name: Events.GuildCreate,
  async execute(guild: Guild, client: BotClient) {
    logger.info(`Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);

    // Create default config
    await getGuildConfig(guild.id);

    // Cache invites
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
      logger.warn(`Could not fetch invites for new guild ${guild.name}`);
    }
  },
};
