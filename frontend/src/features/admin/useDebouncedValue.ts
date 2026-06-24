"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value (spec §25: debounce keyword input ~300ms so
 * we don't fire a search on every keystroke). Returns the latest value once it
 * has been stable for `delayMs`. Kept local to the admin feature so it owns its
 * own dependencies.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
