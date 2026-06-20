/**
 * Applications feature service (spec §10.1, §14.9; ADR-0001 §3.2, §4, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). Session +
 * CSRF are handled by the client; {@link apply} is a mutation, so callers prime
 * the CSRF cookie via `ensureCsrf()` first (ADR-0001 §4.1).
 *
 * No raw `fetch` lives outside `lib/api`. These never request or expose resume
 * bytes or employer notes — the candidate serializers omit them (spec §15.4).
 */

import { apiFetch } from "@/lib/api/client";

import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplyPayload,
  Paginated,
} from "./types";

/**
 * POST /jobs/{slug}/apply/ (IsCandidate). On success returns the created
 * application detail (201). Errors surface as `ApiRequestError`:
 *   400 — field errors, incl. `resume` (no resume on file) and per-question
 *         `answers.<questionId>`.
 *   409 — already applied (conflict); the UI switches to "View Application".
 *   404 — job is not public.
 */
export function apply(
  slug: string,
  payload: ApplyPayload,
  locale?: string,
): Promise<ApplicationDetail> {
  return apiFetch<ApplicationDetail>(
    `/jobs/${encodeURIComponent(slug)}/apply/`,
    { method: "POST", body: payload, locale },
  );
}

/** GET /candidate/applications/ — the candidate's applications, paginated. */
export function getMyApplications(
  locale?: string,
): Promise<Paginated<ApplicationListItem>> {
  return apiFetch<Paginated<ApplicationListItem>>("/candidate/applications/", {
    method: "GET",
    locale,
  });
}

/** GET /candidate/applications/{id}/ — full detail incl. answers + timeline. */
export function getApplication(
  id: string | number,
  locale?: string,
): Promise<ApplicationDetail> {
  return apiFetch<ApplicationDetail>(
    `/candidate/applications/${encodeURIComponent(String(id))}/`,
    { method: "GET", locale },
  );
}

/**
 * GET /jobs/{slug}/application/ (IsCandidate) — the candidate's application for
 * this job, or a 404 when they have not applied. A 404 is the "not applied yet"
 * signal, so callers treat it as `null` rather than an error.
 */
export async function getJobApplicationStatus(
  slug: string,
  locale?: string,
): Promise<ApplicationDetail | null> {
  try {
    return await apiFetch<ApplicationDetail>(
      `/jobs/${encodeURIComponent(slug)}/application/`,
      { method: "GET", locale },
    );
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      return null;
    }
    throw error;
  }
}
