import { MessageHandler } from './pipeline';
import prisma from '../../../database/client';

/**
 * Bump `lastActivityAt` on any open ticket whose channel matches this message.
 * `updateMany` is a no-op (zero rows affected) for non-ticket channels, so we
 * don't need a "is this a ticket?" pre-check.
 */
export const ticketActivityHandler: MessageHandler = {
  name: 'ticketActivity',
  async handle({ message }) {
    await prisma.ticket.updateMany({
      where: { channelId: message.channelId, status: 'open' },
      data: { lastActivityAt: new Date() },
    });
  },
};
