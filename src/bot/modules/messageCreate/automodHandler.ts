import { MessageHandler } from './pipeline';
import { checkAutomod } from '../moderation/automod';

/**
 * Run automod first — if it deletes the message, the rest of the pipeline
 * is short-circuited so we don't operate on a deleted message.
 */
export const automodHandler: MessageHandler = {
  name: 'automod',
  async handle({ message, config }) {
    if (!config.automodEnabled) return;
    const blocked = await checkAutomod(message, config);
    if (blocked) return { stop: true };
  },
};
