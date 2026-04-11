import { randomInt } from 'crypto';

/**
 * Fisher–Yates shuffle using a CSPRNG, picking the first `count` items.
 * Used where fairness matters (giveaway winners, raffle draws): `Math.random()`
 * is not cryptographically secure and `.sort(() => Math.random() - 0.5)` also
 * produces a biased distribution.
 */
export function cryptoSample<T>(items: readonly T[], count: number): T[] {
  const n = items.length;
  const k = Math.min(Math.max(count, 0), n);
  if (k === 0) return [];

  // Partial Fisher–Yates on a copy: only shuffle the first k positions.
  const arr = items.slice();
  for (let i = 0; i < k; i++) {
    const j = i + randomInt(n - i); // j ∈ [i, n)
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}
