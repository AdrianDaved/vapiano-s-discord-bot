import { Request, Response, NextFunction, Router } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../shared/logger';
// Note: Request.user is augmented in src/api/types/express.d.ts. That file is
// a pure declaration and is picked up automatically because it sits inside
// the tsconfig `include` glob — do NOT `import` it, tsc emits the import
// as `require('../types/express')` at runtime and the .d.ts doesn't produce
// a .js file, crashing the bot at boot.

/**
 * Backwards-compat alias. Express.Request is augmented with `user` in
 * `src/api/types/express.d.ts`, so all routes can simply use `Request`. This
 * alias only exists so existing `AuthRequest` imports keep compiling while
 * we migrate them off.
 *
 * @deprecated import `Request` from 'express' instead.
 */
export type AuthRequest = Request;

// ── Guild access cache ──────────────────────────
// Caches the user's guild list from Discord to avoid rate limits.
// Key: `${userId}:${accessToken.slice(-8)}` (scoped to token so stale tokens don't get cache hits)
// Value: { guilds, expiresAt }
interface CachedGuilds {
  guilds: any[];
  expiresAt: number;
}

const guildAccessCache = new Map<string, CachedGuilds>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
      // Serve stale cache if available rather than failing
      const stale = guildAccessCache.get(cacheKey);
      return stale ? stale.guilds : null;
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
 * Factory for guild-scoped routers. Eliminates the boilerplate
 *
 *   const router = Router({ mergeParams: true });
 *   router.use(requireAuth as any);
 *   router.use(requireGuildAccess as any);
 *
 * that every routes/*.ts file used to copy. The returned router is mounted
 * under `/api/guilds/:guildId/<feature>`, has both auth checks pre-applied,
 * and is properly typed so route handlers don't need `as any` casts.
 */
export function createGuildRouter(): Router {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);
  router.use(requireGuildAccess);
  return router;
}

/**
 * Verify the JWT token from the Authorization header or session cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies?.token ||
    (req.session as any)?.token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.API_SECRET!) as {
      id: string;
      username: string;
      avatar: string;
      accessToken: string;
    };
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
 * Result of a guild access check — lets callers produce the right HTTP response.
 */
export type GuildAccessResult =
  | { ok: true }
  | { ok: false; status: 403 | 500; error: string };

/**
 * Verify the authenticated user has Manage Guild permission on `guildId`.
 * Reusable between the `requireGuildAccess` middleware and routes that need to
 * check a *second* guild (e.g. ticket panel cross-deploy target).
 */
export async function checkGuildAccess(
  user: { id: string; accessToken: string },
  guildId: string,
): Promise<GuildAccessResult> {
  try {
    const guilds = await fetchUserGuilds(user.id, user.accessToken);
    if (!guilds) return { ok: false, status: 403, error: 'Could not verify guild access' };

    const guild = guilds.find((g: any) => g.id === guildId);
    if (!guild) return { ok: false, status: 403, error: 'You are not a member of this guild' };

    // Check for Manage Guild permission (0x20) or Administrator (0x8)
    const permissions = BigInt(guild.permissions);
    const hasManageGuild = (permissions & BigInt(0x20)) !== BigInt(0);
    const hasAdmin = (permissions & BigInt(0x8)) !== BigInt(0);
    const isOwner = guild.owner === true;

    if (!hasManageGuild && !hasAdmin && !isOwner) {
      return { ok: false, status: 403, error: 'You do not have management permissions in this guild' };
    }

    return { ok: true };
  } catch (err) {
    logger.error(`Guild access check error: ${err}`);
    return { ok: false, status: 500, error: 'Failed to verify guild access' };
  }
}

/**
 * Check that the user has Manage Guild permission for the requested guild.
 * Must be used after requireAuth and after guildId is available in params.
 */
export async function requireGuildAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const guildId = req.params.guildId;
  if (typeof guildId !== 'string' || !guildId) {
    res.status(400).json({ error: 'Guild ID required' });
    return;
  }
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await checkGuildAccess(req.user, guildId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  next();
}
