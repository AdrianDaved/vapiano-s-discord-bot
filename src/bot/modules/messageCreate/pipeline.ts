/**
 * messageCreate pipeline.
 *
 * The Discord MessageCreate handler used to be a single 200-line function
 * that mixed automod, AFK, auto-responses, +rep, ticket activity tracking,
 * panel auto-repost, and sticky messages — all sharing a try/catch scope.
 * A bug in any one feature crashed the rest, and there was no clear order.
 *
 * Each feature is now a `MessageHandler` with its own try/catch boundary.
 * One handler crashing logs an error and continues to the next instead of
 * silently breaking everything else for that message.
 */
import { Message } from 'discord.js';
import { GuildConfig } from '@prisma/client';
import logger from '../../../shared/logger';

export interface MessageContext {
  message: Message;
  /** Guild config — pre-loaded once per message and shared across handlers. */
  config: GuildConfig;
}

export type MessageHandlerResult = void | { stop: true };

export interface MessageHandler {
  /** Used in error logs to identify the failing handler. */
  name: string;
  /** Returns `{ stop: true }` to halt the pipeline (e.g. message was deleted). */
  handle(ctx: MessageContext): Promise<MessageHandlerResult>;
}

/**
 * Run handlers in order. A throwing handler is logged but doesn't break the
 * rest of the pipeline; a handler that returns `{ stop: true }` halts it.
 */
export async function runPipeline(handlers: readonly MessageHandler[], ctx: MessageContext): Promise<void> {
  for (const handler of handlers) {
    try {
      const result = await handler.handle(ctx);
      if (result?.stop) return;
    } catch (err) {
      logger.error(
        `[messageCreate:${handler.name}] ${err instanceof Error ? err.stack || err.message : String(err)}`,
      );
      // Continue to the next handler — feature isolation is the whole point.
    }
  }
}
