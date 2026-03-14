import { Events, Invite } from 'discord.js';
import { BotClient, InviteData } from '../../shared/types';
import { inviteCache } from './ready';
import logger from '../../shared/logger';

export default {
  name: Events.InviteCreate,
  async execute(invite: Invite, client: BotClient) {
    if (!invite.guild) return;

    const guildInvites = inviteCache.get(invite.guild.id) || new Map<string, InviteData>();
    guildInvites.set(invite.code, {
      code: invite.code,
      uses: invite.uses ?? 0,
      inviterId: invite.inviter?.id ?? null,
    });
    inviteCache.set(invite.guild.id, guildInvites);
    logger.debug(`[Invites] Cached new invite ${invite.code} in ${invite.guild.name}`);
  },
};
