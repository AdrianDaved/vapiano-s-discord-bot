/**
 * Central timer registry — stores all setInterval handles so they can be
 * cleared on graceful shutdown, preventing memory leaks and orphaned timers.
 */

const timers: NodeJS.Timeout[] = [];

/** Register an interval and return its handle. */
export function registerInterval(callback: () => void, ms: number): NodeJS.Timeout {
  const handle = setInterval(callback, ms);
  timers.push(handle);
  return handle;
}

/** Clear all registered timers. Called on shutdown. */
export function clearAllTimers(): void {
  for (const handle of timers) {
    clearInterval(handle);
  }
  timers.length = 0;
}
