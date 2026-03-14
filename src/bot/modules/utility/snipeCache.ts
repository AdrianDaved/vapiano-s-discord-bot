/**
 * Snipe cache — stores recently deleted messages per channel for the /snipe command.
 * Keeps up to 10 messages per channel, auto-expires after 5 minutes.
 */

export interface DeletedMessageData {
  authorId: string;
  authorTag: string;
  authorAvatar: string | null;
  content: string;
  attachmentUrl: string | null;
  deletedAt: Date;
}

// Map<channelId, DeletedMessageData[]>
export const deletedMessagesCache = new Map<string, DeletedMessageData[]>();

const MAX_PER_CHANNEL = 10;
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Add a deleted message to the cache.
 */
export function addDeletedMessage(channelId: string, data: DeletedMessageData) {
  let stack = deletedMessagesCache.get(channelId);
  if (!stack) {
    stack = [];
    deletedMessagesCache.set(channelId, stack);
  }

  // Push to front (most recent first)
  stack.unshift(data);

  // Trim to max
  if (stack.length > MAX_PER_CHANNEL) {
    stack.pop();
  }

  // Schedule expiry for this entry
  setTimeout(() => {
    const current = deletedMessagesCache.get(channelId);
    if (!current) return;
    const idx = current.indexOf(data);
    if (idx !== -1) current.splice(idx, 1);
    if (current.length === 0) deletedMessagesCache.delete(channelId);
  }, EXPIRY_MS);
}

/**
 * Get a deleted message by channel and index (0-based).
 */
export function getDeletedMessage(
  channelId: string,
  index: number
): DeletedMessageData | null {
  const stack = deletedMessagesCache.get(channelId);
  if (!stack || index >= stack.length) return null;
  return stack[index];
}
