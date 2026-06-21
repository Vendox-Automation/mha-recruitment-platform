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

/**
 * The complete set of stable Job Fit reason codes the backend can emit
 * (spec §16; Phase 11 L-B1). Kept here so the component can render each via
 * `t("reasons.<code>")` and FALL BACK gracefully for any unrecognised code
 * rather than rendering a raw English/code string to a zh-CN user.
 */
export const FIT_REASON_CODES = {
  matched: [
    "title_strong",
    "location_match",
    "employment_type_match",
    "resume_overlap_strong",
  ],
  gaps: [
    "title_related",
    "title_mismatch",
    "location_mismatch",
    "employment_type_mismatch",
    "resume_overlap_partial",
    "resume_overlap_none",
  ],
  unknown: [
    "title_unknown",
    "location_unknown",
    "employment_type_unknown",
    "resume_unknown",
  ],
} as const;

const KNOWN_FIT_REASON_CODES = new Set<string>([
  ...FIT_REASON_CODES.matched,
  ...FIT_REASON_CODES.gaps,
  ...FIT_REASON_CODES.unknown,
]);

/** A resolver from a reason code to its localised label. */
export type ReasonTranslator = (code: string) => string;

/**
 * Resolve a list of reason codes to localised strings, dropping any code we do
 * not recognise. Unknown codes are skipped (never shown raw) so a future
 * backend code can't leak an English/identifier string into the localised UI.
 */
export function localizeReasons(
  codes: string[],
  translate: ReasonTranslator,
): string[] {
  return codes
    .filter((code) => KNOWN_FIT_REASON_CODES.has(code))
    .map((code) => translate(code));
}
