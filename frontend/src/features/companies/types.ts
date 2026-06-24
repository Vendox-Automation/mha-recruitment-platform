/**
 * Public company domain types (spec §14.4, §21.7).
 *
 * Mirrors `PublicCompanyListSerializer` and `PublicCompanyDetailSerializer` in
 * `apps/jobs/serializers.py`. Only approved-employer presentation fields are
 * modelled; there are no public reviews (spec §14.4) and no contact details
 * beyond what the detail serializer exposes (`website`).
 */

import type { Paginated, PublicJobListItem } from "@/features/jobs/types";

export type { Paginated };

/**
 * Per-star count map for a company's reviews (5→1), exposed on the detail
 * serializer. Mirrors the reviews feature's `RatingDistribution`.
 */
export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>;

/** Approved-company directory row (PublicCompanyListSerializer). */
export interface PublicCompanyListItem {
  slug: string;
  company_name: string;
  logo: string | null;
  company_summary: string | null;
  industry: string | null;
  company_location: string | null;
  active_job_count: number;
  /** Mean review rating, or null when the company has no reviews yet. */
  average_rating: number | null;
  /** Total published reviews for the company. */
  review_count: number;
}

/** Approved-company detail with culture/benefits + active jobs. */
export interface PublicCompanyDetail {
  slug: string;
  company_name: string;
  logo: string | null;
  company_summary: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  company_location: string | null;
  culture_text: string | null;
  benefits_text: string | null;
  is_approved: boolean;
  active_jobs: PublicJobListItem[];
  /** Mean review rating, or null when the company has no reviews yet. */
  average_rating: number | null;
  /** Total published reviews for the company. */
  review_count: number;
  /** Per-star count breakdown (5→1) for the reviews summary. */
  rating_distribution: RatingDistribution;
}

/** Directory search parameters held in the URL query string. */
export interface CompanySearchParams {
  search?: string;
  page: number;
}
