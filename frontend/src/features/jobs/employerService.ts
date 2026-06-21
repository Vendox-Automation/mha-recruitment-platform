/**
 * Employer (owner) jobs feature service (spec §14.11; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`; these give the employer job screens typed
 * shapes and a single place that knows the owner job endpoints. All endpoints
 * are `IsApprovedEmployer` + session-cookie — the central client handles
 * credentials, CSRF, and `Accept-Language`.
 *
 * Django is authoritative: the server stamps employer/created_by/source_type/
 * status on create and owns every lifecycle transition (publish/close/reopen),
 * so the client never sends those fields — it only POSTs the lifecycle action.
 */

import { apiFetch } from "@/lib/api/client";

import type { EmployerJob, EmployerJobWrite } from "./employerTypes";
import type { Paginated } from "./types";

const PAGE_SIZE = 50;

/** POST /employer/jobs/ — create a DRAFT job (server stamps owner + status). */
export function createJob(
  input: EmployerJobWrite,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>("/employer/jobs/", {
    method: "POST",
    body: input,
    locale,
  });
}

/** GET /employer/jobs/ — the signed-in employer's own jobs (paginated). */
export function listMyJobs(locale?: string): Promise<Paginated<EmployerJob>> {
  return apiFetch<Paginated<EmployerJob>>(
    `/employer/jobs/?page_size=${PAGE_SIZE}`,
    { method: "GET", locale },
  );
}

/** GET /employer/jobs/{id}/ — one own job's full owner detail (404 if not owned). */
export function getMyJob(
  id: string | number,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>(`/employer/jobs/${encodeURIComponent(String(id))}/`, {
    method: "GET",
    locale,
  });
}

/**
 * PATCH /employer/jobs/{id}/ — edit an own job. The nested screening_questions
 * list fully replaces the job's questions. Rejected by the server if the job is
 * admin-SUSPENDED.
 */
export function updateJob(
  id: string | number,
  input: EmployerJobWrite,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>(`/employer/jobs/${encodeURIComponent(String(id))}/`, {
    method: "PATCH",
    body: input,
    locale,
  });
}

/** POST /employer/jobs/{id}/publish/ — DRAFT|CLOSED → PUBLISHED (refused if deadline past). */
export function publishJob(
  id: string | number,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>(
    `/employer/jobs/${encodeURIComponent(String(id))}/publish/`,
    { method: "POST", body: {}, locale },
  );
}

/** POST /employer/jobs/{id}/close/ — PUBLISHED → CLOSED. */
export function closeJob(
  id: string | number,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>(
    `/employer/jobs/${encodeURIComponent(String(id))}/close/`,
    { method: "POST", body: {}, locale },
  );
}

/** POST /employer/jobs/{id}/reopen/ — CLOSED → PUBLISHED. */
export function reopenJob(
  id: string | number,
  locale?: string,
): Promise<EmployerJob> {
  return apiFetch<EmployerJob>(
    `/employer/jobs/${encodeURIComponent(String(id))}/reopen/`,
    { method: "POST", body: {}, locale },
  );
}

export { PAGE_SIZE as EMPLOYER_JOBS_PAGE_SIZE };
