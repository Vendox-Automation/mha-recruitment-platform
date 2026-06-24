/**
 * Locale-aware presentation helpers for reviews. Dates use `Intl` so they read
 * naturally in each locale; review and reply free text is user-authored and is
 * rendered as-is (never translated).
 */

/** Format a date (no time) in the active locale, or null when unparseable. */
export function formatReviewDate(
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
