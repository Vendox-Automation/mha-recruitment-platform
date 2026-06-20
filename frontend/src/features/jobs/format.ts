/**
 * Locale-aware presentation helpers for public job data (spec §24, §25).
 *
 * Salary/date formatting uses `Intl` so figures and dates read naturally in
 * each locale. Employer-authored CONTENT (title, description, requirements) is
 * never translated — only platform chrome and formatted numbers/dates are.
 */

import type { PublicJobListItem } from "./types";

/** Map a backend employment-type code to an `jobs.employmentType` i18n key. */
const EMPLOYMENT_TYPE_KEYS: Record<string, string> = {
  FULL_TIME: "fullTime",
  PART_TIME: "partTime",
  CONTRACT: "contract",
  INTERNSHIP: "internship",
  TEMPORARY: "temporary",
  // Tolerate already-normalised values too.
  fullTime: "fullTime",
  partTime: "partTime",
  contract: "contract",
  internship: "internship",
  temporary: "temporary",
};

/**
 * Resolve an employment-type i18n key, or `null` when the code is unknown so
 * the caller can fall back to the raw value rather than render a blank label.
 */
export function employmentTypeKey(code: string | null | undefined): string | null {
  if (!code) return null;
  return EMPLOYMENT_TYPE_KEYS[code] ?? null;
}

/** Format a published/deadline date string for display in the active locale. */
export function formatDate(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Outcome of resolving a job's salary for display. `disclosed: false` means the
 * caller should render the localised "Salary not disclosed" label — we never
 * fabricate a figure (spec §14.2: undisclosed → no figures).
 */
export interface SalaryDisplay {
  disclosed: boolean;
  /** Pre-formatted, locale-aware range/figure (only when `disclosed`). */
  text: string | null;
}

/**
 * Compute a salary label. Returns `{ disclosed: false }` when the employer hid
 * figures OR when both bounds are missing — in both cases the API nulls the
 * numbers, so an undisclosed result is indistinguishable from "no data" and is
 * rendered the same honest way.
 */
export function formatSalary(
  job: Pick<
    PublicJobListItem,
    "salary_disclosed" | "salary_min" | "salary_max" | "salary_currency" | "salary_period"
  >,
  locale: string,
  periodLabels?: Partial<Record<string, string>>,
): SalaryDisplay {
  if (!job.salary_disclosed || (job.salary_min == null && job.salary_max == null)) {
    return { disclosed: false, text: null };
  }

  const currency = job.salary_currency ?? undefined;
  const format = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: currency ? "currency" : "decimal",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  let amount: string;
  if (job.salary_min != null && job.salary_max != null) {
    amount =
      job.salary_min === job.salary_max
        ? format(job.salary_min)
        : `${format(job.salary_min)} – ${format(job.salary_max)}`;
  } else {
    amount = format((job.salary_min ?? job.salary_max) as number);
  }

  const periodKey = job.salary_period?.toLowerCase();
  const period = periodKey ? periodLabels?.[periodKey] : undefined;
  return { disclosed: true, text: period ? `${amount} · ${period}` : amount };
}
