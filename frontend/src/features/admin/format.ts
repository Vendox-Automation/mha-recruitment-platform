/**
 * Locale-aware presentation helpers for admin data. Dates use `Intl` so they
 * read naturally in each locale; we never translate employer-authored content.
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
