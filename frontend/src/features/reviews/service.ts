/**
 * Company reviews feature service (product-owner-approved reviews scope;
 * ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`. Posting a review is `AllowAny` (Google-style
 * intake); the reply and admin endpoints are gated by Django (authoritative) —
 * any UX gating in the components is convenience only.
 */

import { apiFetch } from "@/lib/api/client";

import type {
  AdminReviewListItem,
  AdminReviewListParams,
  CompanyReview,
  CreateReviewInput,
  Paginated,
  ReviewReply,
} from "./types";

/** Build the `?page=` query for a company's reviews; omits page 1. */
export function buildReviewsQuery(page = 1): string {
  if (page <= 1) return "";
  return `?page=${page}`;
}

/** GET a page of a company's reviews (AllowAny). */
export function listCompanyReviews(
  slug: string,
  page = 1,
  locale?: string,
): Promise<Paginated<CompanyReview>> {
  return apiFetch<Paginated<CompanyReview>>(
    `/companies/${encodeURIComponent(slug)}/reviews/${buildReviewsQuery(page)}`,
    { method: "GET", locale },
  );
}

/**
 * POST a review for a company (AllowAny). A 400 surfaces `fields`
 * (e.g. reviewer_email, rating); a 429 surfaces as a throttled error.
 */
export function createCompanyReview(
  slug: string,
  input: CreateReviewInput,
  locale?: string,
): Promise<CompanyReview> {
  return apiFetch<CompanyReview>(
    `/companies/${encodeURIComponent(slug)}/reviews/`,
    { method: "POST", body: input, locale },
  );
}

/** POST an employer reply to a review (own company only; 404 otherwise). */
export function replyToReview(
  reviewId: number,
  body: string,
  locale?: string,
): Promise<ReviewReply> {
  return apiFetch<ReviewReply>(
    `/employer/reviews/${reviewId}/reply/`,
    { method: "POST", body: { body }, locale },
  );
}

/** DELETE an employer's reply to a review (own company only). */
export function deleteReviewReply(
  reviewId: number,
  locale?: string,
): Promise<void> {
  return apiFetch<void>(`/employer/reviews/${reviewId}/reply/`, {
    method: "DELETE",
    locale,
  });
}

/**
 * Build the `/admin/reviews/` query string from the active filter state. An
 * empty company / search and page 1 are omitted so the URL stays clean and the
 * cache key (see `adminReviewsListKey`) and request agree.
 */
export function buildAdminReviewsQuery(
  params: AdminReviewListParams = {},
): string {
  const search = new URLSearchParams();
  const company = params.company?.trim();
  if (company) search.set("company", company);
  const term = params.search?.trim();
  if (term) search.set("search", term);
  if (params.rating && params.rating !== "ALL") {
    search.set("rating", String(params.rating));
  }
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** GET /admin/reviews/?company=&search=&page= — the moderation list. */
export function getAdminReviews(
  params: AdminReviewListParams = {},
  locale?: string,
): Promise<Paginated<AdminReviewListItem>> {
  return apiFetch<Paginated<AdminReviewListItem>>(
    `/admin/reviews/${buildAdminReviewsQuery(params)}`,
    { method: "GET", locale },
  );
}

/** DELETE /admin/reviews/{id}/ — remove a review (admin only). */
export function deleteAdminReview(
  id: number,
  locale?: string,
): Promise<void> {
  return apiFetch<void>(`/admin/reviews/${id}/`, { method: "DELETE", locale });
}

/** DELETE /admin/reviews/{id}/reply/ — remove a review's reply (admin only). */
export function deleteAdminReviewReply(
  id: number,
  locale?: string,
): Promise<void> {
  return apiFetch<void>(`/admin/reviews/${id}/reply/`, {
    method: "DELETE",
    locale,
  });
}
