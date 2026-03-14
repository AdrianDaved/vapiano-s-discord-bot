import { Events, Invite } from 'discord.js';
import { BotClient, InviteData } from '../../shared/types';
import { inviteCache } from './ready';
import logger from '../../shared/logger';

export default {
  name: Events.InviteDelete,
  async execute(invite: Invite, client: BotClient) {
    if (!invite.guild) return;

    const guildInvites = inviteCache.get(invite.guild.id);
    if (guildInvites) {
      guildInvites.delete(invite.code);
      logger.debug(`[Invites] Removed invite ${invite.code} from cache in ${invite.guild.name}`);
    }
  },
};
