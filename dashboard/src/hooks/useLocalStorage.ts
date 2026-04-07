import { useState, useCallback, useRef } from 'react';

/**
 * useState but persisted in localStorage.
 * Key should be unique per page/field (e.g. 'tickets-deploy-channelId').
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Keep a ref to the current key so the memoized setValue always writes to the right key
  const keyRef = useRef(key);
  keyRef.current = key;

  // Stable setter — same function reference across renders, preventing unnecessary effect re-runs
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []); // empty deps: setStoredValue is stable, keyRef always current

  return [storedValue, setValue];
}
