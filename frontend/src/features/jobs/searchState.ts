/**
 * Job-search URL query-state (spec §15.3: "Search-state persistence in URL
 * query parameters"). Pure functions so the search ↔ URL mapping is unit
 * testable and the same logic round-trips a shareable link reliably.
 *
 *   URLSearchParams  <—parseSearchParams—  JobSearchParams  —toQueryString—>  string
 *
 * Defaults: sort = "newest", page = 1. Blank/invalid values are dropped so a
 * cleaned URL never carries empty `?keyword=&salary_min=` noise.
 */

import type { JobSearchParams, JobSortOption } from "./types";

const SORT_OPTIONS: readonly JobSortOption[] = ["newest", "relevant"] as const;

function parsePositiveInt(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

/** Read filter/sort/page state from a URL query string (or URLSearchParams). */
export function parseSearchParams(
  source: URLSearchParams | string,
): JobSearchParams {
  const params =
    typeof source === "string" ? new URLSearchParams(source) : source;

  const keyword = params.get("keyword")?.trim() || undefined;
  const location = params.get("location")?.trim() || undefined;
  const employmentType = params.get("employment_type")?.trim() || undefined;
  const salaryMin = parsePositiveInt(params.get("salary_min"));
  const salaryMax = parsePositiveInt(params.get("salary_max"));

  const rawSort = params.get("sort");
  const sort: JobSortOption = SORT_OPTIONS.includes(rawSort as JobSortOption)
    ? (rawSort as JobSortOption)
    : "newest";

  const page = parsePositiveInt(params.get("page"));

  return {
    keyword,
    location,
    employment_type: employmentType,
    salary_min: salaryMin,
    salary_max: salaryMax,
    sort,
    page: page && page >= 1 ? page : 1,
  };
}

/**
 * Serialise search state back to a query string, omitting defaults and empty
 * values so shared URLs stay clean (`sort=newest` and `page=1` are implied).
 */
export function toQueryString(params: JobSearchParams): string {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.location) query.set("location", params.location);
  if (params.employment_type) query.set("employment_type", params.employment_type);
  if (params.salary_min != null) query.set("salary_min", String(params.salary_min));
  if (params.salary_max != null) query.set("salary_max", String(params.salary_max));
  if (params.sort !== "newest") query.set("sort", params.sort);
  if (params.page > 1) query.set("page", String(params.page));
  return query.toString();
}

/** Are two search states equivalent? (Avoids redundant URL writes / fetches.) */
export function searchParamsEqual(a: JobSearchParams, b: JobSearchParams): boolean {
  return toQueryString(a) === toQueryString(b);
}
