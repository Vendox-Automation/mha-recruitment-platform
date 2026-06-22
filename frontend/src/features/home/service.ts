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

/** Operator brands surfaced first on the homepage, in this order. */
const FEATURED_FIRST = ["vendox", "mha", "woodee", "wewe"];

/**
 * GET a few approved organisations for the homepage (real data, may be empty),
 * with the operator's own brands ordered first (then the rest in their existing
 * order — Array.sort is stable). Real list; no fabricated rows.
 */
export async function getFeaturedCompanies(
  locale?: string,
): Promise<PublicCompanyListItem[]> {
  const page = await listCompanies({ page: 1 }, locale);
  const rank = (slug: string) => {
    const i = FEATURED_FIRST.indexOf(slug);
    return i === -1 ? FEATURED_FIRST.length : i;
  };
  const ordered = [...page.results].sort((a, b) => rank(a.slug) - rank(b.slug));
  return ordered.slice(0, HOME_COMPANIES_LIMIT);
}
