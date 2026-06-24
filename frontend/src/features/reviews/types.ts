/**
 * Company reviews domain types (product-owner-approved reviews scope).
 *
 * Reviews are Google-style: anyone can post with a NAME + EMAIL (no account)
 * and a review publishes immediately. Employers can reply to reviews of their
 * own company; admins can delete reviews and replies. The email is collected
 * but never returned publicly — only `reviewer_name` is shown.
 *
 * These mirror the backend serializers under `/companies/{slug}/reviews/`,
 * `/employer/reviews/...`, and `/admin/reviews/...`. Authorization is enforced
 * by Django (authoritative); the client gating is UX only.
 */

/** DRF page-number pagination envelope (DefaultPagination). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** A 1–5 star rating. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** The employer's public reply attached to a review. */
export interface ReviewReply {
  body: string;
  created_at: string;
}

/** A public review row (GET /companies/{slug}/reviews/). */
export interface CompanyReview {
  id: number;
  reviewer_name: string;
  rating: Rating;
  title: string;
  body: string;
  created_at: string;
  /** The employer reply, when present. */
  reply: ReviewReply | null;
}

/** Body for POST /companies/{slug}/reviews/ (title/body optional). */
export interface CreateReviewInput {
  reviewer_name: string;
  reviewer_email: string;
  rating: Rating;
  title?: string;
  body?: string;
}

/** The 5→1 count map exposed on the company detail. */
export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>;

/** Admin reviews row (GET /admin/reviews/). */
export interface AdminReviewListItem {
  id: number;
  company_name: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: Rating;
  title: string;
  body: string;
  created_at: string;
  has_reply: boolean;
}

/** Query parameters for the admin reviews moderation list. */
export interface AdminReviewListParams {
  /** Company-name filter passed to the backend. */
  company?: string;
  /** Free-text search across reviewer / title / body. */
  search?: string;
  /** 1-based page index. */
  page?: number;
}
