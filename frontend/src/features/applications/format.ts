/**
 * Locale-aware presentation helpers for application data (spec §24, §25).
 * Dates use `Intl` so they read naturally in each locale; we never translate
 * employer-authored answer content.
 */

/** Format a date (no time) in the active locale, or null when unparseable. */
export function formatDate(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Format a date + time in the active locale (used in the status timeline). */
export function formatDateTime(
  value: string | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
