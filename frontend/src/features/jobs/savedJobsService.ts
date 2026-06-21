/**
 * Saved-jobs feature service (spec §15.5, §21.2; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`. Every endpoint is `IsCandidate` and scoped to
 * the signed-in candidate's own profile — the session cookie is sent by the
 * central client (`credentials: "include"`); no token is ever held in JS.
 */

import { apiFetch } from "@/lib/api/client";

import type { SavedJob } from "./savedJobsTypes";

/** GET the signed-in candidate's saved jobs (most-recent first). */
export function listSavedJobs(locale?: string): Promise<SavedJob[]> {
  return apiFetch<SavedJob[]>("/candidate/saved-jobs/", {
    method: "GET",
    locale,
  });
}

/**
 * Bookmark a public job by its slug (or id). The backend is idempotent: saving
 * an already-saved job returns the existing row (200) rather than erroring, so an
 * over-eager save is harmless. Returns the saved row.
 */
export function saveJob(jobRef: string, locale?: string): Promise<SavedJob> {
  return apiFetch<SavedJob>("/candidate/saved-jobs/", {
    method: "POST",
    body: { job: jobRef },
    locale,
  });
}

/**
 * Remove a bookmark. The DELETE path is keyed by the JOB's UUID (not the
 * SavedJob row id), so the caller passes the job id. Resolves on 204 (no body);
 * a 404 means the bookmark was already gone, which callers may treat as success.
 */
export function unsaveJob(jobId: string, locale?: string): Promise<void> {
  return apiFetch<void>(`/candidate/saved-jobs/${encodeURIComponent(jobId)}/`, {
    method: "DELETE",
    locale,
  });
}
