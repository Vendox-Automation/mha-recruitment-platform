/**
 * Smart Job Fit feature service (spec §16, §21.6; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`. Both endpoints are `IsCandidate` and scoped
 * to the signed-in candidate's own profile — the session cookie is sent by the
 * central client (`credentials: "include"`); no token is ever held in JS.
 *
 * A non-public job yields 404 (the backend reuses the Phase 4 visibility gate),
 * which callers treat as "no fit available" rather than a transient error.
 */

import { apiFetch } from "@/lib/api/client";

import type { JobFitResult } from "./types";

/** GET the signed-in candidate's current fit for a public job (404 if not public). */
export function getJobFit(slug: string, locale?: string): Promise<JobFitResult> {
  return apiFetch<JobFitResult>(
    `/jobs/${encodeURIComponent(slug)}/fit/`,
    { method: "GET", locale },
  );
}

/**
 * POST to recompute the fit afresh (after a resume / preference change). Returns
 * the recomputed result in the same shape; the backend overwrites the single
 * current result and updates `generated_at`.
 */
export function regenerateJobFit(
  slug: string,
  locale?: string,
): Promise<JobFitResult> {
  return apiFetch<JobFitResult>(
    `/jobs/${encodeURIComponent(slug)}/fit/regenerate/`,
    { method: "POST", locale },
  );
}
