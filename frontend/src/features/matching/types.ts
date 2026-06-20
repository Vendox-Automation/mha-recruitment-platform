/**
 * Smart Job Fit domain types (spec §16; ADR-0001 §3.2 features/<x>, §7).
 *
 * These mirror the candidate-facing `JobFitResultSerializer`
 * (`apps/matching/serializers.py`) plus the `disclaimer` string the view
 * attaches to every response (`apps/matching/api/views.py` — spec §16.6, so it
 * can never be omitted).
 *
 * The `matched`/`gaps`/`unknown` arrays and `explanation` are backend-generated
 * CANDIDATE-FACING strings. They are currently English; full zh-CN localization
 * of these backend strings is a Phase 11 item, so the UI renders them verbatim
 * (never fake-translated). Only the UI chrome around them is localised.
 */

/** Fit band — the deterministic engine's bucket for the numeric score. */
export type JobFitBand = "strong" | "good" | "partial" | "limited";

/** A single candidate's fit for a single job (current cached result). */
export interface JobFitResult {
  /** Whole-number percentage 0–100 produced by the rule engine. */
  score: number;
  band: JobFitBand;
  /** Backend-generated strengths (rendered as-is, see file header). */
  matched: string[];
  /** Backend-generated possible gaps (rendered as-is). */
  gaps: string[];
  /** Backend-generated factors with no data (rendered as-is). */
  unknown: string[];
  /** Friendly one-paragraph explanation (deterministic or AI; rendered as-is). */
  explanation: string;
  /** Whether a real AI provider phrased the explanation (vs deterministic). */
  ai_enabled: boolean;
  ai_provider: string;
  ai_model: string;
  rule_version: string;
  /** ISO timestamp of when this result was computed. */
  generated_at: string;
  /** Required disclaimer (spec §16.6) — always present, always rendered. */
  disclaimer: string;
}
