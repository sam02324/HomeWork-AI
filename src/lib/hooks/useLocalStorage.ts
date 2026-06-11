'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted state backed by localStorage. SSR-safe: starts from `defaultValue`,
 * hydrates from storage on mount, and writes back on change.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Hydrate from storage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
