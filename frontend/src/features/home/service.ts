/**
 * Homepage data services (spec §14.1 E "Featured organisations").
 *
 * Reuses the public companies endpoint to surface a handful of approved
 * organisations on the homepage. No counts are hard-coded and no rows are
 * fabricated — an empty list renders an honest empty state (AGENTS §13).
 */

import { listCompanies } from "@/features/companies/service";
import type { PublicCompanyListItem } from "@/features/companies/types";

/** How many featured organisations the homepage showcase shows. */
export const HOME_COMPANIES_LIMIT = 6;

/** GET a few approved organisations for the homepage (real data, may be empty). */
export async function getFeaturedCompanies(
  locale?: string,
): Promise<PublicCompanyListItem[]> {
  const page = await listCompanies({ page: 1 }, locale);
  return page.results.slice(0, HOME_COMPANIES_LIMIT);
}
