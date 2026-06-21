/**
 * Homepage data services (spec §14.1 E "Opportunities and organisations").
 *
 * These reuse the public jobs/companies endpoints to surface the LATEST real
 * published roles and a handful of approved organisations on the homepage. No
 * counts are hard-coded and no rows are fabricated — an empty list renders an
 * honest empty state (spec §14.1 E, AGENTS §13).
 */

import { listCompanies } from "@/features/companies/service";
import type { PublicCompanyListItem } from "@/features/companies/types";
import { searchJobs } from "@/features/jobs/service";
import type { PublicJobListItem } from "@/features/jobs/types";

/** How many latest roles / featured organisations the homepage shows. */
export const HOME_JOBS_LIMIT = 4;
export const HOME_COMPANIES_LIMIT = 4;

/** GET the newest published roles for the homepage (real data, may be empty). */
export async function getLatestJobs(
  locale?: string,
): Promise<PublicJobListItem[]> {
  const page = await searchJobs({ sort: "newest", page: 1 }, locale);
  return page.results.slice(0, HOME_JOBS_LIMIT);
}

/** GET a few approved organisations for the homepage (real data, may be empty). */
export async function getFeaturedCompanies(
  locale?: string,
): Promise<PublicCompanyListItem[]> {
  const page = await listCompanies({ page: 1 }, locale);
  return page.results.slice(0, HOME_COMPANIES_LIMIT);
}
