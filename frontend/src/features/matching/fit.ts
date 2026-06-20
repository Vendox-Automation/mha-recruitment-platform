/**
 * Pure Smart Job Fit presentation logic (spec §16.4, §13.7).
 *
 * Kept separate from the component so the band→label/tone mapping and the
 * "sparse data" judgement are unit-testable without rendering. No i18n or React
 * here — the component resolves the returned keys against the message catalogue.
 */

import type { BadgeTone } from "@/components/ui";

import type { JobFitBand, JobFitResult } from "./types";

/**
 * Map a band to a non-colour Badge tone derived from the status/data-series
 * tokens. Colour is NEVER the only cue (spec §13.7): the component always
 * renders the localised band LABEL and the numeric score alongside the badge,
 * so a colour-blind or monochrome reader gets the full meaning from text.
 */
const BAND_TONE: Record<JobFitBand, BadgeTone> = {
  strong: "success",
  good: "info",
  partial: "warning",
  limited: "neutral",
};

/** The i18n key (under `jobs.fit.band`) for a band's human label. */
const BAND_LABEL_KEY: Record<JobFitBand, string> = {
  strong: "strong",
  good: "good",
  partial: "partial",
  limited: "limited",
};

/** Resolve the Badge tone for a band (falls back to neutral for unknown bands). */
export function bandTone(band: string): BadgeTone {
  return BAND_TONE[band as JobFitBand] ?? "neutral";
}

/** Resolve the i18n label key for a band (falls back to `limited`). */
export function bandLabelKey(band: string): string {
  return BAND_LABEL_KEY[band as JobFitBand] ?? "limited";
}

/**
 * Whether the result carries too little information to be meaningful, so the UI
 * should show an honest "not enough information yet" empty state instead of a
 * score that would overstate confidence.
 *
 * Sparse means: nothing matched AND nothing flagged as a gap, with every signal
 * sitting in `unknown` (e.g. no resume uploaded, no preferences set). We do not
 * suppress a real partial/limited score that has concrete matched or gap facts —
 * that is genuine guidance, not noise.
 */
export function isSparseFit(
  result: Pick<JobFitResult, "matched" | "gaps" | "unknown">,
): boolean {
  const hasSignal = result.matched.length > 0 || result.gaps.length > 0;
  return !hasSignal && result.unknown.length > 0;
}
