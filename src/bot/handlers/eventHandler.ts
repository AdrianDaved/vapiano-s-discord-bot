import { readdirSync } from 'fs';
import { join } from 'path';
import { BotClient } from '../../shared/types';
import logger from '../../shared/logger';

/**
 * Load all event files from the events directory and register them on the client.
 */
export async function loadEvents(client: BotClient): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');
  const eventFiles = readdirSync(eventsPath).filter(
    (f) => f.endsWith('.ts') || f.endsWith('.js')
  );

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const eventModule = await import(filePath);
      const event = eventModule.default || eventModule;

      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args: any[]) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args: any[]) => event.execute(...args, client));
        }
        logger.info(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
      } else {
        logger.warn(`Skipping event ${filePath}: missing "name" or "execute"`);
      }
    } catch (err) {
      logger.error(`Failed to load event ${filePath}: ${err}`);
    }
  }
}
