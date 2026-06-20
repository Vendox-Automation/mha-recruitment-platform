/**
 * Candidate feature service (spec §14.7 profile, §14.9 dashboard, §22.2 resume;
 * ADR-0001 §3.2 features/<x>, §5 private resume, §7 API contract).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`; these give the candidate screens typed
 * shapes and a single place that knows the candidate endpoints. Session + CSRF
 * are handled by the central client.
 *
 * RESUME SECURITY (ADR-0001 §5): the resume bytes are NEVER returned as a URL.
 * Upload goes out as `multipart/form-data` (the central client passes FormData
 * through and does not force a JSON content-type). Retrieval is a top-level
 * browser navigation to the permission-checked download endpoint
 * ({@link resumeDownloadUrl}) — we never construct a public file URL.
 */

import { API_BASE_URL, apiFetch } from "@/lib/api/client";

import type {
  CandidateDashboard,
  CandidateProfile,
  CandidateProfileUpdate,
  ResumeMetadata,
} from "./types";

/** GET the signed-in candidate's own profile (editable + read-only fields). */
export function getProfile(locale?: string): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/candidate/profile/", {
    method: "GET",
    locale,
  });
}

/**
 * PATCH the editable profile fields. Resume fields are not part of
 * {@link CandidateProfileUpdate}, so they can never be sent; the backend treats
 * them as read-only regardless (the resume is managed via the resume endpoints).
 */
export function updateProfile(
  input: Partial<CandidateProfileUpdate>,
  locale?: string,
): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>("/candidate/profile/", {
    method: "PATCH",
    body: input,
    locale,
  });
}

/** GET the candidate's dashboard snapshot (honest zero stats for Phase 6). */
export function getDashboard(locale?: string): Promise<CandidateDashboard> {
  return apiFetch<CandidateDashboard>("/candidate/dashboard/", {
    method: "GET",
    locale,
  });
}

/**
 * Upload (or replace) the resume via `multipart/form-data`. The field name is
 * `file` (matches `request.FILES.get("file")`). The central client detects the
 * FormData body and lets the browser set the multipart boundary — we must NOT
 * set a JSON content-type. Returns metadata only (never a URL).
 */
export function uploadResume(
  file: File,
  locale?: string,
): Promise<ResumeMetadata> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<ResumeMetadata>("/candidate/resume/", {
    method: "POST",
    body,
    locale,
  });
}

/** DELETE the candidate's resume (204, no body). */
export function deleteResume(locale?: string): Promise<void> {
  return apiFetch<void>("/candidate/resume/", {
    method: "DELETE",
    locale,
  });
}

/**
 * Absolute URL of the permission-checked resume download endpoint. This is the
 * ONLY way to read the resume bytes (ADR-0001 §5): open it via a normal
 * top-level browser navigation/link (a plain GET that carries the session
 * cookie). It is NOT a public file URL — the view re-checks ownership and
 * streams the file as an attachment.
 */
export function resumeDownloadUrl(): string {
  return `${API_BASE_URL}/candidate/resume/download/`;
}
