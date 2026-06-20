/**
 * Public jobs feature service (spec §14.2–14.3, §15.3; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`; these give the public job screens typed
 * shapes and a single place that knows the public job endpoints. The endpoints
 * are AllowAny, so no session is required — the central client still sends the
 * locale as `Accept-Language` for localised error messages.
 */

import { apiFetch } from "@/lib/api/client";

import type {
  JobSearchParams,
  Paginated,
  PublicJobDetail,
  PublicJobListItem,
} from "./types";

const PAGE_SIZE = 20;

/** Build a clean `/jobs/` query string, omitting empty/unset filters. */
export function buildJobSearchQuery(params: JobSearchParams): string {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.location) query.set("location", params.location);
  if (params.employment_type) query.set("employment_type", params.employment_type);
  if (params.salary_min != null) query.set("salary_min", String(params.salary_min));
  if (params.salary_max != null) query.set("salary_max", String(params.salary_max));
  query.set("sort", params.sort);
  query.set("page", String(params.page));
  query.set("page_size", String(PAGE_SIZE));
  return query.toString();
}

/** GET a page of public job-search results. */
export function searchJobs(
  params: JobSearchParams,
  locale?: string,
): Promise<Paginated<PublicJobListItem>> {
  return apiFetch<Paginated<PublicJobListItem>>(
    `/jobs/?${buildJobSearchQuery(params)}`,
    { method: "GET", locale },
  );
}

/** GET a single public job by slug (404 when not public). */
export function getJob(slug: string, locale?: string): Promise<PublicJobDetail> {
  return apiFetch<PublicJobDetail>(`/jobs/${encodeURIComponent(slug)}/`, {
    method: "GET",
    locale,
  });
}

export { PAGE_SIZE };
