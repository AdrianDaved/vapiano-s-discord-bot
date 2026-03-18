/**
 * Messages API routes — Send plain text or embed messages to a Discord channel.
 * Supports full embed customization: fields, timestamp, author/footer icons, title URL.
 */
import { Router, Response } from 'express';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { requireAuth, requireGuildAccess, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/validate';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.use(requireAuth as any);
messagesRouter.use(requireGuildAccess as any);

/** Parse a hex color string into a number. Returns default blurple on failure. */
function resolveColor(hex?: string): number {
  if (!hex) return 0x5865f2;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? 0x5865f2 : parsed;
}

/** Basic URL validation — only allow http/https. */
function safeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:') return url;
  } catch { /* not a valid URL */ }
  return undefined;
}

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

  // Validate embed limits
  if (embed) {
    if (embed.title && embed.title.length > 256) {
      res.status(400).json({ error: 'El título del embed no puede superar 256 caracteres' });
      return;
    }
    if (embed.description && embed.description.length > 4096) {
      res.status(400).json({ error: 'La descripción del embed no puede superar 4096 caracteres' });
      return;
    }
    if (embed.authorName && embed.authorName.length > 256) {
      res.status(400).json({ error: 'El nombre del autor no puede superar 256 caracteres' });
      return;
    }
    if (embed.footerText && embed.footerText.length > 2048) {
      res.status(400).json({ error: 'El pie de página no puede superar 2048 caracteres' });
      return;
    }
    if (embed.fields) {
      if (!Array.isArray(embed.fields)) {
        res.status(400).json({ error: 'fields debe ser un array' });
        return;
      }
      if (embed.fields.length > 25) {
        res.status(400).json({ error: 'Máximo 25 campos por embed' });
        return;
      }
      for (let i = 0; i < embed.fields.length; i++) {
        const f = embed.fields[i];
        if (!f.name || !f.value) {
          res.status(400).json({ error: `El campo ${i + 1} necesita nombre y valor` });
          return;
        }
        if (f.name.length > 256) {
          res.status(400).json({ error: `El nombre del campo ${i + 1} no puede superar 256 caracteres` });
          return;
        }
        if (f.value.length > 1024) {
          res.status(400).json({ error: `El valor del campo ${i + 1} no puede superar 1024 caracteres` });
          return;
        }
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  const body: Record<string, any> = {};
  if (content) body.content = content;

  if (embed) {
    const discordEmbed: Record<string, any> = {};

    if (embed.title) discordEmbed.title = embed.title;
    if (embed.description) discordEmbed.description = embed.description;

    // Color
    discordEmbed.color = resolveColor(embed.color);

    // Title URL (makes title clickable)
    const titleUrl = safeUrl(embed.titleUrl);
    if (titleUrl) discordEmbed.url = titleUrl;

    // Author with optional icon
    if (embed.authorName || embed.author) {
      discordEmbed.author = {
        name: embed.authorName || embed.author,
      };
      const authorIcon = safeUrl(embed.authorIconUrl);
      if (authorIcon) discordEmbed.author.icon_url = authorIcon;
    }

    // Footer with optional icon
    if (embed.footerText || embed.footer) {
      discordEmbed.footer = {
        text: embed.footerText || embed.footer,
      };
      const footerIcon = safeUrl(embed.footerIconUrl);
      if (footerIcon) discordEmbed.footer.icon_url = footerIcon;
    }

    // Images
    const imageUrl = safeUrl(embed.imageUrl || embed.image);
    if (imageUrl) discordEmbed.image = { url: imageUrl };

    const thumbnailUrl = safeUrl(embed.thumbnailUrl || embed.thumbnail);
    if (thumbnailUrl) discordEmbed.thumbnail = { url: thumbnailUrl };

    // Timestamp
    if (embed.timestamp) {
      discordEmbed.timestamp = new Date().toISOString();
    }

    // Fields
    if (embed.fields && Array.isArray(embed.fields) && embed.fields.length > 0) {
      discordEmbed.fields = embed.fields.map((f: any) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      }));
    }

    body.embeds = [discordEmbed];
  }

  const message = await rest.post(Routes.channelMessages(channelId), { body }) as { id: string };

  res.json({ id: message.id, channelId });
}) as any);
