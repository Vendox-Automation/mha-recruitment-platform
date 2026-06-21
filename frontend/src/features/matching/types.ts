/**
 * Smart Job Fit domain types (spec §16; ADR-0001 §3.2 features/<x>, §7).
 *
 * These mirror the candidate-facing `JobFitResultSerializer`
 * (`apps/matching/serializers.py`) plus the `disclaimer` string the view
 * attaches to every response (`apps/matching/api/views.py` — spec §16.6).
 *
 * Localisation (Phase 11 L-B1): the backend now returns `matched`/`gaps`/
 * `unknown` as arrays of stable reason CODE strings (NOT prose). The FRONTEND
 * maps each code to localised copy under `jobs.detail.fit.reasons.<code>` so
 * both locales stay at full parity. The short explanation is also composed on
 * the frontend from those localised reasons; the backend `ai_explanation` is
 * only rendered on the future AI path (`ai_enabled === true`).
 */

/** Fit band — the deterministic engine's bucket for the numeric score. */
export type JobFitBand = "strong" | "good" | "partial" | "limited";

/** A single candidate's fit for a single job (current cached result). */
export interface JobFitResult {
  /** Whole-number percentage 0–100 produced by the rule engine. */
  score: number;
  band: JobFitBand;
  /** Stable reason CODES for strengths (localised on the frontend). */
  matched: string[];
  /** Stable reason CODES for possible gaps (localised on the frontend). */
  gaps: string[];
  /** Stable reason CODES with no data to compare (localised on the frontend). */
  unknown: string[];
  /** Whether a real AI provider phrased the explanation (vs deterministic). */
  ai_enabled: boolean;
  /**
   * AI-authored explanation prose. EMPTY in the MVP (deterministic path); only
   * rendered when `ai_enabled` is true (future AI path).
   */
  ai_explanation: string;
  ai_provider: string;
  ai_model: string;
  rule_version: string;
  /** ISO timestamp of when this result was computed. */
  generated_at: string;
  /** Backend disclaimer (spec §16.6) — the UI always renders the localised one. */
  disclaimer: string;
}
