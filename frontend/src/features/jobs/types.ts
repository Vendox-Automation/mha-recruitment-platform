/**
 * Public job domain types (spec §14.2–14.3, §21.4).
 *
 * These mirror the PUBLIC serializers in `apps/jobs/serializers.py`
 * (`PublicJobListSerializer`, `PublicJobDetailSerializer`,
 * `PublicCompanySummarySerializer`, `ScreeningQuestionPreviewSerializer`).
 * Only safe presentation fields are modelled — there is no employer-owned or
 * server-authoritative state here. Optional fields are `null` when the
 * employer left them blank or chose not to disclose salary figures.
 */

/** DRF page-number pagination envelope (shared by jobs + companies lists). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type EmploymentType =
  | "fullTime"
  | "partTime"
  | "contract"
  | "internship"
  | "temporary";

export type JobSortOption = "newest" | "relevant";

/** Compact company block embedded in a public job (PublicCompanySummary). */
export interface PublicCompanySummary {
  slug: string;
  company_name: string;
  logo: string | null;
  industry: string | null;
  company_location: string | null;
}

/** A public job-search result row (PublicJobListSerializer). */
export interface PublicJobListItem {
  slug: string;
  title: string;
  location: string | null;
  employment_type: string;
  /** null whenever the employer did not disclose figures. */
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_disclosed: boolean;
  /** ISO 639 code of the employer-authored content — content is NOT translated. */
  listing_language: string;
  is_mha_supported: boolean;
  published_at: string | null;
  company: PublicCompanySummary | null;
}

/** A public preview of a screening question (no answers). */
export interface ScreeningQuestionPreview {
  id: string | number;
  question: string;
  question_type: string;
  is_required: boolean;
  options_json: string[];
  display_order: number;
}

/** Public job detail (PublicJobDetailSerializer = list fields + body). */
export interface PublicJobDetail extends PublicJobListItem {
  description: string;
  requirements: string;
  application_deadline: string | null;
  source_type: string;
  screening_questions: ScreeningQuestionPreview[];
}

/**
 * Search parameters as held in the URL query string (spec §15.3). Empty/unset
 * values are simply absent from the query string so shareable URLs stay clean.
 */
export interface JobSearchParams {
  keyword?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  sort: JobSortOption;
  page: number;
}
