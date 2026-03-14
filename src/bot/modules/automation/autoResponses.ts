import { Message } from 'discord.js';
import prisma from '../../../database/client';
import logger from '../../../shared/logger';

/**
 * Check if a message matches any auto-response triggers for the guild.
 */
export async function checkAutoResponses(message: Message, config: any): Promise<void> {
  if (!message.guild) return;

  try {
    const autoResponses = await prisma.autoResponse.findMany({
      where: { guildId: message.guild.id, enabled: true },
    });

    for (const ar of autoResponses) {
      let matches = false;
      const content = message.content.toLowerCase();
      const trigger = ar.trigger.toLowerCase();

      switch (ar.matchType) {
        case 'exact':
          matches = content === trigger;
          break;
        case 'contains':
          matches = content.includes(trigger);
          break;
        case 'startsWith':
          matches = content.startsWith(trigger);
          break;
        case 'regex':
          try {
            const regex = new RegExp(ar.trigger, 'i');
            matches = regex.test(message.content);
          } catch {
            // Invalid regex, skip
          }
          break;
        default:
          matches = content.includes(trigger);
      }

      if (matches) {
        // Replace template variables in the response
        const response = ar.response
          .replace(/{user}/g, `<@${message.author.id}>`)
          .replace(/{username}/g, message.author.username)
          .replace(/{server}/g, message.guild.name)
          .replace(/{channel}/g, `<#${message.channelId}>`);

        if ('send' in message.channel) {
          await message.channel.send(response);
        }
        break; // Only trigger the first match
      }
    }
  } catch (err) {
    logger.error(`[AutoResponse] Error checking auto-responses: ${err}`);
  }
}
