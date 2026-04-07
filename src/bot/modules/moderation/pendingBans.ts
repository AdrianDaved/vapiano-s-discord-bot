/**
 * Shared in-memory map for tracking pending bans initiated by bot commands.
 * Used to correlate guildBanAdd audit log entries with the actual moderator
 * who triggered the ban via a slash command (since the bot is the API caller).
 */

interface PendingBan {
  guildId: string;
  moderatorId: string;
  reason: string;
}

export const pendingBans = new Map<string, PendingBan>();
