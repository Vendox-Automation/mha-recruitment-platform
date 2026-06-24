/**
 * Admin feature service (admin scope; ADR-0001 §3.2, §4, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). Session +
 * CSRF are handled by the client; the action endpoints are POSTs, so the client
 * attaches the CSRF header automatically. No raw `fetch` lives outside
 * `lib/api`. Authorization is enforced by Django — these calls only succeed for
 * an ADMIN session (the guard here is UX, not security).
 */

import { apiFetch } from "@/lib/api/client";

import type {
  AdminEmployerDetail,
  AdminEmployerListItem,
  AdminEmployerListParams,
  AdminSummary,
  Paginated,
} from "./types";

/** GET /admin/summary/ — approval counts for the dashboard. */
export function getAdminSummary(locale?: string): Promise<AdminSummary> {
  return apiFetch<AdminSummary>("/admin/summary/", { method: "GET", locale });
}

/**
 * Build the `/admin/employers/` query string from the active filter state. The
 * "ALL" status and empty search are omitted so the URL stays clean and the
 * cache key (see `adminEmployersListKey`) and request agree.
 */
export function buildEmployersQuery(params: AdminEmployerListParams = {}): string {
  const search = new URLSearchParams();
  if (params.status && params.status !== "ALL") {
    search.set("status", params.status);
  }
  const trimmed = params.search?.trim();
  if (trimmed) {
    search.set("search", trimmed);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** GET /admin/employers/?status=&search=&page= — the paginated queue. */
export function getAdminEmployers(
  params: AdminEmployerListParams = {},
  locale?: string,
): Promise<Paginated<AdminEmployerListItem>> {
  return apiFetch<Paginated<AdminEmployerListItem>>(
    `/admin/employers/${buildEmployersQuery(params)}`,
    { method: "GET", locale },
  );
}

/** GET /admin/employers/{id}/ — full review detail. */
export function getAdminEmployer(
  id: string | number,
  locale?: string,
): Promise<AdminEmployerDetail> {
  return apiFetch<AdminEmployerDetail>(
    `/admin/employers/${encodeURIComponent(String(id))}/`,
    { method: "GET", locale },
  );
}

/** POST /admin/employers/{id}/approve/ — approve a pending/rejected employer. */
export function approveEmployer(
  id: string | number,
  locale?: string,
): Promise<AdminEmployerDetail> {
  return apiFetch<AdminEmployerDetail>(
    `/admin/employers/${encodeURIComponent(String(id))}/approve/`,
    { method: "POST", locale },
  );
}

/**
 * POST /admin/employers/{id}/reject/ — reject with a required reason. A missing
 * reason surfaces as `ApiRequestError` with `fields.reason` (400).
 */
export function rejectEmployer(
  id: string | number,
  reason: string,
  locale?: string,
): Promise<AdminEmployerDetail> {
  return apiFetch<AdminEmployerDetail>(
    `/admin/employers/${encodeURIComponent(String(id))}/reject/`,
    { method: "POST", body: { reason }, locale },
  );
}

/** POST /admin/employers/{id}/suspend/ — suspend an approved employer. */
export function suspendEmployer(
  id: string | number,
  locale?: string,
): Promise<AdminEmployerDetail> {
  return apiFetch<AdminEmployerDetail>(
    `/admin/employers/${encodeURIComponent(String(id))}/suspend/`,
    { method: "POST", locale },
  );
}

/** POST /admin/employers/{id}/restore/ — restore a suspended employer. */
export function restoreEmployer(
  id: string | number,
  locale?: string,
): Promise<AdminEmployerDetail> {
  return apiFetch<AdminEmployerDetail>(
    `/admin/employers/${encodeURIComponent(String(id))}/restore/`,
    { method: "POST", locale },
  );
}
