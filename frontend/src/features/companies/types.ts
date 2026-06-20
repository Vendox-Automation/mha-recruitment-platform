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

/** Approved-company directory row (PublicCompanyListSerializer). */
export interface PublicCompanyListItem {
  slug: string;
  company_name: string;
  logo: string | null;
  company_summary: string | null;
  industry: string | null;
  company_location: string | null;
  active_job_count: number;
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
}

/** Directory search parameters held in the URL query string. */
export interface CompanySearchParams {
  search?: string;
  page: number;
}
