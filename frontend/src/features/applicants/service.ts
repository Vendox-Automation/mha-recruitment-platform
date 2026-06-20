/**
 * Employer applicant-workspace service (spec §14.10, §14.12; ADR-0001 §3.2
 * features/<x>, §5 private resume, §7 API contract).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`; these give the employer screens typed shapes
 * and the single place that knows the employer applicant endpoints. Session +
 * CSRF are handled by the central client.
 *
 * RESUME SECURITY (ADR-0001 §5): the applicant resume is NEVER returned as a
 * public URL. {@link applicantResumeUrl} returns the permission-checked download
 * endpoint, opened via a normal top-level browser navigation (a GET that carries
 * the session cookie). The backend re-checks employer ownership of the job and
 * streams the file as an attachment — there is no predictable public file URL.
 */

import { API_BASE_URL, apiFetch } from "@/lib/api/client";

import type {
  ApplicantListParams,
  EmployerApplicantDetail,
  EmployerApplicantListItem,
  EmployerDashboard,
  Paginated,
  StatusChangeInput,
} from "./types";

/** Build a query string from the list params, omitting empty values. */
function buildQuery(params: ApplicantListParams = {}): string {
  const search = new URLSearchParams();
  if (params.job) search.set("job", params.job);
  if (params.status) search.set("status", params.status);
  if (params.search) search.set("search", params.search);
  if (params.ordering) search.set("ordering", params.ordering);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** GET /employer/applications/ — applicants across all of the employer's jobs. */
export function listApplicants(
  params: ApplicantListParams = {},
  locale?: string,
): Promise<Paginated<EmployerApplicantListItem>> {
  return apiFetch<Paginated<EmployerApplicantListItem>>(
    `/employer/applications/${buildQuery(params)}`,
    { method: "GET", locale },
  );
}

/** GET /employer/jobs/{job_id}/applications/ — applicants to ONE owned job. */
export function getJobApplicants(
  jobId: string,
  params: ApplicantListParams = {},
  locale?: string,
): Promise<Paginated<EmployerApplicantListItem>> {
  // The per-job endpoint scopes by path; only `status` is honoured server-side,
  // so search/ordering are applied client-side in the workspace.
  const query = params.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return apiFetch<Paginated<EmployerApplicantListItem>>(
    `/employer/jobs/${jobId}/applications/${query}`,
    { method: "GET", locale },
  );
}

/** GET /employer/applications/{id}/ — full owned-application detail. */
export function getApplicant(
  id: string,
  locale?: string,
): Promise<EmployerApplicantDetail> {
  return apiFetch<EmployerApplicantDetail>(`/employer/applications/${id}/`, {
    method: "GET",
    locale,
  });
}

/**
 * PATCH /employer/applications/{id}/status/ — change the applicant's stage. The
 * server records the transition in the immutable status history. Returns the
 * refreshed detail (with the new history row).
 */
export function updateApplicantStatus(
  id: string,
  input: StatusChangeInput,
  locale?: string,
): Promise<EmployerApplicantDetail> {
  return apiFetch<EmployerApplicantDetail>(
    `/employer/applications/${id}/status/`,
    { method: "PATCH", body: input, locale },
  );
}

/**
 * PATCH /employer/applications/{id}/notes/ — employer-only private notes. These
 * are NEVER exposed to candidates. Returns the refreshed detail.
 */
export function updateApplicantNotes(
  id: string,
  notes: string,
  locale?: string,
): Promise<EmployerApplicantDetail> {
  return apiFetch<EmployerApplicantDetail>(
    `/employer/applications/${id}/notes/`,
    { method: "PATCH", body: { employer_private_notes: notes }, locale },
  );
}

/** GET /employer/dashboard/ — attention queue, active jobs, pipeline (real). */
export function getEmployerDashboard(
  locale?: string,
): Promise<EmployerDashboard> {
  return apiFetch<EmployerDashboard>("/employer/dashboard/", {
    method: "GET",
    locale,
  });
}

/**
 * Absolute URL of the permission-checked resume download for one application.
 * This is the ONLY way to read the applicant's resume bytes (ADR-0001 §5): open
 * it via a normal top-level browser navigation/link (a plain GET that carries
 * the session cookie). It is NOT a public file URL — the view re-checks that the
 * application is to one of THIS employer's jobs and streams it as an attachment.
 */
export function applicantResumeUrl(id: string): string {
  return `${API_BASE_URL}/employer/applications/${id}/resume/`;
}
