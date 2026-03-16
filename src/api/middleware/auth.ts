import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../shared/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    avatar: string;
    accessToken: string;
  };
}

// ── Guild access cache ──────────────────────────
// Caches the user's guild list from Discord to avoid rate limits.
// Key: `${userId}:${accessToken.slice(-8)}` (scoped to token so stale tokens don't get cache hits)
// Value: { guilds, expiresAt }
interface CachedGuilds {
  guilds: any[];
  expiresAt: number;
}

const guildAccessCache = new Map<string, CachedGuilds>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of guildAccessCache) {
    if (entry.expiresAt < now) guildAccessCache.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Fetch user guilds from Discord, with caching to avoid 429 rate limits.
 */
export async function fetchUserGuilds(userId: string, accessToken: string): Promise<any[] | null> {
  const cacheKey = `${userId}:${accessToken.slice(-8)}`;
  const cached = guildAccessCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.guilds;
  }

  const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Handle rate limiting: retry once after the specified delay
  if (response.status === 429) {
    const body = await response.json().catch(() => ({})) as any;
    const retryAfter = (body.retry_after ?? 1) * 1000;
    logger.warn(`Discord rate limited, retrying after ${retryAfter}ms`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter));

    const retryResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!retryResponse.ok) {
      const errBody = await retryResponse.text().catch(() => 'unknown');
      logger.error(`Guild fetch retry failed: ${retryResponse.status}: ${errBody}`);
      return null;
    }

    const guilds = await retryResponse.json() as any[];
    guildAccessCache.set(cacheKey, { guilds, expiresAt: Date.now() + CACHE_TTL_MS });
    return guilds;
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => 'unknown');
    logger.error(`Guild access check: Discord API returned ${response.status}: ${errBody}`);
    return null;
  }

  const guilds = await response.json() as any[];
  guildAccessCache.set(cacheKey, { guilds, expiresAt: Date.now() + CACHE_TTL_MS });
  return guilds;
}

/**
 * Verify the JWT token from the Authorization header or session cookie.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.token ||
    (req.session as any)?.token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.API_SECRET!) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      avatar: decoded.avatar,
      accessToken: decoded.accessToken,
    };
    next();
  } catch (err) {
    logger.warn(`Invalid token: ${err}`);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Check that the user has Manage Guild permission for the requested guild.
 * Must be used after requireAuth and after guildId is available in params.
 * Results are cached per-user for 2 minutes to avoid Discord API rate limits.
 */
export async function requireGuildAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const { guildId } = req.params;
  if (!guildId) {
    res.status(400).json({ error: 'Guild ID required' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const guilds = await fetchUserGuilds(req.user.id, req.user.accessToken);

    if (!guilds) {
      res.status(403).json({ error: 'Could not verify guild access' });
      return;
    }

    const guild = guilds.find((g: any) => g.id === guildId);

    if (!guild) {
      res.status(403).json({ error: 'You are not a member of this guild' });
      return;
    }

    // Check for Manage Guild permission (0x20) or Administrator (0x8)
    const permissions = BigInt(guild.permissions);
    const hasManageGuild = (permissions & BigInt(0x20)) !== BigInt(0);
    const hasAdmin = (permissions & BigInt(0x8)) !== BigInt(0);
    const isOwner = guild.owner === true;

    if (!hasManageGuild && !hasAdmin && !isOwner) {
      res.status(403).json({ error: 'You do not have management permissions in this guild' });
      return;
    }

    next();
  } catch (err) {
    logger.error(`Guild access check error: ${err}`);
    res.status(500).json({ error: 'Failed to verify guild access' });
  }
}
