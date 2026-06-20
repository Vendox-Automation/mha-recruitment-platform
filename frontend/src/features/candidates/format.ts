/**
 * Locale-aware presentation helpers for candidate data (spec §24, §25).
 *
 * Reuses the jobs employment-type vocabulary so a candidate's preferred type
 * reads against the same labels candidates see on job listings. Date formatting
 * uses `Intl` so the resume "uploaded" date reads naturally per locale.
 */

/** Map a backend employment-type code to a `jobs.employmentType` i18n key. */
const EMPLOYMENT_TYPE_KEYS: Record<string, string> = {
  FULL_TIME: "fullTime",
  PART_TIME: "partTime",
  CONTRACT: "contract",
  INTERNSHIP: "internship",
  TEMPORARY: "temporary",
};

/**
 * Resolve a `jobs.employmentType` key for a known employment-type code, or null
 * when the code is unrecognised so the caller can fall back to the raw value.
 */
export function employmentTypeKeyOrNull(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  return EMPLOYMENT_TYPE_KEYS[code] ?? null;
}

/**
 * As {@link employmentTypeKeyOrNull} but for the known option list where the
 * code is guaranteed valid — returns the key directly for `t(...)`.
 */
export function employmentTypeKeyFor(code: string): string {
  return EMPLOYMENT_TYPE_KEYS[code] ?? code;
}

/** Format an ISO date-time for display in the active locale (date only). */
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
