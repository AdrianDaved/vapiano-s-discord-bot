import { Events, MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { BotClient } from '../../shared/types';
import { handleStarboardReaction } from '../modules/starboard/starboardHandler';
import { handleEmojiReactionRole } from '../modules/moderation/reactionRoles';

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, client: BotClient) {
    // Ignore bot reactions
    if (user.bot) return;
    if (!reaction.message.guild) return;

    // Handle starboard
    await handleStarboardReaction(reaction, user, client);

    // Handle emoji reaction roles
    await handleEmojiReactionRole(reaction, user, 'add');
  },
};
