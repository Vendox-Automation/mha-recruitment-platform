/**
 * Pure presentation helpers for employer analytics (spec §15.8, §23, §24).
 *
 * Kept separate from the component so the honesty rules (null = "not enough
 * data") and the humanised-duration logic are unit-testable without the UI tree.
 *
 * INTEGRITY: a `null` metric is NEVER coerced to 0 — the helpers return `null`
 * so the caller renders an explicit "not enough data yet" instead of a figure
 * the data cannot support.
 */

import type { ApplicationStatus } from "@/features/applications/types";

import type { StageDistribution } from "./types";

/** Stage order for the distribution chart/table (matches the pipeline + rejected). */
export const STAGE_ORDER: readonly ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
] as const;

/**
 * Format a 0–1 conversion rate as a locale-aware percentage, or `null` when the
 * backend withheld it (unreliable). Returning `null` — not "0%" — is the whole
 * point: the caller shows an honest "not enough data yet".
 */
export function formatConversionRate(
  rate: number | null,
  locale: string,
): string | null {
  if (rate === null || Number.isNaN(rate)) return null;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(rate);
}

/** A humanised duration, expressed in the largest sensible unit. */
export interface HumanDuration {
  /** The rounded amount in the chosen unit. */
  value: number;
  /** The unit key (matches `employer.analytics.duration.*`). */
  unit: "minutes" | "hours" | "days";
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Reduce a seconds figure to an approximate `{value, unit}` for "~2 days" copy,
 * or `null` when the backend withheld it. Picks the largest unit that yields a
 * value ≥ 1 so the figure reads naturally (90 minutes → ~2 hours, not 5400 s).
 * Sub-minute durations round up to 1 minute (never "0 minutes").
 */
export function humaniseDuration(
  seconds: number | null,
): HumanDuration | null {
  if (seconds === null || Number.isNaN(seconds) || seconds < 0) return null;
  if (seconds >= DAY) {
    return { value: Math.round(seconds / DAY), unit: "days" };
  }
  if (seconds >= HOUR) {
    return { value: Math.round(seconds / HOUR), unit: "hours" };
  }
  return { value: Math.max(1, Math.round(seconds / MINUTE)), unit: "minutes" };
}

/** A single stage row prepared for the chart/table. */
export interface StageBar {
  status: ApplicationStatus;
  count: number;
  /** Share of the total, 0–1 (0 when there are no applications). */
  fraction: number;
  /** Width percentage for a bar, 0–100. */
  percent: number;
}

/**
 * Turn the raw stage distribution into ordered bar rows. The bar length is
 * relative to the BUSIEST stage (so the largest stage fills the track and the
 * rest scale against it); the table alternative always carries the exact counts.
 */
export function toStageBars(distribution: StageDistribution): {
  bars: StageBar[];
  total: number;
} {
  const counts = STAGE_ORDER.map((status) => distribution[status] ?? 0);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const max = Math.max(0, ...counts);
  const bars = STAGE_ORDER.map((status, index) => {
    const count = counts[index];
    return {
      status,
      count,
      fraction: total > 0 ? count / total : 0,
      percent: max > 0 ? (count / max) * 100 : 0,
    };
  });
  return { bars, total };
}
