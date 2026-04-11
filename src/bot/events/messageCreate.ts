import { Events, Message } from 'discord.js';
import { BotClient } from '../../shared/types';
import { getGuildConfig } from '../utils';
import { runPipeline, MessageHandler } from '../modules/messageCreate/pipeline';
import { automodHandler } from '../modules/messageCreate/automodHandler';
import { afkHandler } from '../modules/messageCreate/afkHandler';
import { autoResponsesHandler } from '../modules/messageCreate/autoResponsesHandler';
import { repHandler } from '../modules/messageCreate/repHandler';
import { ticketActivityHandler } from '../modules/messageCreate/ticketActivityHandler';
import { panelRepostHandler } from '../modules/messageCreate/panelRepostHandler';
import { stickyMessageHandler } from '../modules/messageCreate/stickyHandler';

// Order matters:
// 1. automod runs first and can short-circuit (deletes the message)
// 2. AFK / auto-responses / +rep are user-facing reactions
// 3. ticket activity is a quiet DB write
// 4. panel repost and sticky messages re-send themselves at the bottom,
//    so they go last to land below everything else.
const handlers: readonly MessageHandler[] = [
  automodHandler,
  afkHandler,
  autoResponsesHandler,
  repHandler,
  ticketActivityHandler,
  panelRepostHandler,
  stickyMessageHandler,
];

export default {
  name: Events.MessageCreate,
  async execute(message: Message, _client: BotClient) {
    if (message.author.bot || !message.guild) return;

    const config = await getGuildConfig(message.guild.id);
    await runPipeline(handlers, { message, config });
  },
};
