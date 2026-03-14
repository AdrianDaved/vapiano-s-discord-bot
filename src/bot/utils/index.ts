import prisma from '../../database/client';
import logger from '../../shared/logger';
import { CachedGuildConfig } from '../../shared/types';

// In-memory cache with TTL
const cache = new Map<string, CachedGuildConfig>();
const CACHE_TTL = 60_000; // 1 minute

/**
 * Get or create a guild config, using cache when available.
 */
export async function getGuildConfig(guildId: string) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId },
    update: {},
  });

  cache.set(guildId, { data: config, fetchedAt: Date.now() });
  return config;
}

/**
 * Update a guild config and invalidate cache.
 */
export async function updateGuildConfig(guildId: string, data: Record<string, any>) {
  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId, ...data },
    update: data,
  });

  cache.set(guildId, { data: config, fetchedAt: Date.now() });
  return config;
}

/**
 * Invalidate cached config for a guild.
 */
export function invalidateGuildCache(guildId: string) {
  cache.delete(guildId);
}

/**
 * Check if a module is enabled for a guild.
 */
export async function isModuleEnabled(guildId: string, moduleField: string): Promise<boolean> {
  const config = await getGuildConfig(guildId);
  return (config as any)[moduleField] === true;
}

/**
 * Format a duration in seconds to human-readable.
 */
export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

/**
 * Parse a duration string like "1d2h30m" into seconds.
 */
export function parseDuration(input: string): number | null {
  const regex = /(\d+)\s*(s|sec|m|min|h|hr|hour|d|day|w|week)/gi;
  let total = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('s')) total += val;
    else if (unit.startsWith('m')) total += val * 60;
    else if (unit.startsWith('h')) total += val * 3600;
    else if (unit.startsWith('d')) total += val * 86400;
    else if (unit.startsWith('w')) total += val * 604800;
  }

  return total > 0 ? total : null;
}

/**
 * Replace template variables in a string.
 */
export function replaceTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Calculate XP needed for a given level.
 * Formula: 5 * level^2 + 50 * level + 100
 */
export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

/**
 * Calculate level from total XP.
 */
export function levelFromXp(xp: number): number {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

/**
 * Truncate text to a max length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create a simple embed color from a module name.
 */
export function moduleColor(module: string): number {
  const colors: Record<string, number> = {
    invites: 0x5865f2,     // blurple
    backup: 0x57f287,      // green
    leveling: 0xfee75c,    // yellow
    moderation: 0xed4245,  // red
    automod: 0xeb459e,     // fuchsia
    automation: 0xf47b67,  // orange
    tickets: 0x5865f2,     // blurple
    config: 0x99aab5,      // grey
    reputation: 0x57f287,  // green
    giveaway: 0xf47b67,    // orange
    suggestions: 0x3498db, // blue
    starboard: 0xfee75c,   // yellow
    utility: 0x99aab5,     // grey
    afk: 0x99aab5,         // grey
    default: 0x5865f2,
  };
  return colors[module] || colors.default;
}

export { logger, prisma };
