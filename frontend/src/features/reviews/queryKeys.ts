/** TanStack Query keys for the reviews feature (single source of truth). */

import type { AdminReviewListParams } from "./types";

/** Root key — invalidating this refreshes every reviews query. */
export const REVIEWS_ROOT_KEY = ["reviews"] as const;

/** A company's reviews list, scoped by slug + page + locale. */
export function companyReviewsKey(slug: string, page: number, locale: string) {
  return ["reviews", "company", slug, { page, locale }] as const;
}

/** All review pages for a company (for broad invalidation after a mutation). */
export function companyReviewsRootKey(slug: string) {
  return ["reviews", "company", slug] as const;
}

/** The admin moderation list, scoped by its current filter / search / page. */
export function adminReviewsListKey(params: AdminReviewListParams = {}) {
  return [
    "reviews",
    "admin",
    "list",
    {
      company: params.company ?? "",
      search: params.search ?? "",
      rating: params.rating ?? "ALL",
      page: params.page ?? 1,
    },
  ] as const;
}
