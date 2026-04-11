import { MessageHandler } from './pipeline';
import { processStickyMessage } from '../sticky/stickyHandler';

/**
 * Sticky text messages — runs last so it ends up at the bottom of the
 * channel after every other handler had a chance to react.
 */
export const stickyMessageHandler: MessageHandler = {
  name: 'sticky',
  async handle({ message }) {
    await processStickyMessage(message);
  },
};
