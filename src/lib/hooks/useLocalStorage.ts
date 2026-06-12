'use client';

import { useCallback, useState } from 'react';

/**
 * Persisted state backed by localStorage. SSR-safe: returns `defaultValue` on
 * the server, reads storage on the first client render, and writes back on
 * change. Avoid rendering the value into SSR-visible markup (hydration may
 * differ from the server default).
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // ignore malformed storage
    }
    return defaultValue;
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore quota / unavailable storage
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set];
}
