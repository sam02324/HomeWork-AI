'use client';

import { useEffect } from 'react';

interface ShortcutOptions {
  /** Require Cmd (mac) / Ctrl (win) to be held. */
  meta?: boolean;
  shift?: boolean;
  /** Fire even when focus is inside an input/textarea. Default false. */
  allowInInput?: boolean;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Bind a keyboard shortcut to a callback.
 * `key` is matched case-insensitively against event.key (e.g. 'k', '/', 'Escape').
 */
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  const { meta = false, shift = false, allowInInput = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (!allowInInput && isEditableTarget(e.target)) return;

      const metaOk = meta ? e.metaKey || e.ctrlKey : true;
      const shiftOk = shift ? e.shiftKey : true;
      const keyOk = e.key.toLowerCase() === key.toLowerCase();

      // When meta is NOT required, ignore events that carry meta/ctrl so we
      // don't hijack browser shortcuts.
      const noStrayModifier = meta ? true : !(e.metaKey || e.ctrlKey);

      if (keyOk && metaOk && shiftOk && noStrayModifier) {
        callback(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, meta, shift, allowInInput, enabled]);
}
