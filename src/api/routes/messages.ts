/**
 * Messages API routes — Send plain text or embed messages to a Discord channel.
 */
import { Router, Response } from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.use(requireAuth as any);
messagesRouter.use(requireGuildAccess as any);

/**
 * POST /api/guilds/:guildId/messages/send — Send a message to a Discord channel
 */
messagesRouter.post('/send', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { channelId, content, embed } = req.body;

  if (!channelId) {
    res.status(400).json({ error: 'channelId is required' });
    return;
  }

  if (!content && !embed) {
    res.status(400).json({ error: 'At least content or embed is required' });
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  const body: Record<string, any> = {};
  if (content) body.content = content;

  if (embed) {
    const discordEmbed: Record<string, any> = {};
    if (embed.title) discordEmbed.title = embed.title;
    if (embed.description) discordEmbed.description = embed.description;
    if (embed.color) {
      // Convert hex color to integer
      const hex = embed.color.replace('#', '');
      discordEmbed.color = parseInt(hex, 16);
    }
    if (embed.author) discordEmbed.author = { name: embed.author };
    if (embed.footer) discordEmbed.footer = { text: embed.footer };
    if (embed.image) discordEmbed.image = { url: embed.image };
    if (embed.thumbnail) discordEmbed.thumbnail = { url: embed.thumbnail };
    body.embeds = [discordEmbed];
  }

  const message = await rest.post(Routes.channelMessages(channelId), { body }) as { id: string };

  res.json({ id: message.id, channelId });
}) as any);
