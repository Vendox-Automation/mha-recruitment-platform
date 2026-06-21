/**
 * Employer-owned job domain types (spec §14.11; ADR-0001 §4, §7).
 *
 * These mirror the OWNER serializers in `apps/jobs/serializers.py`
 * (`EmployerJobSerializer`, `ScreeningQuestionSerializer`). Unlike the public
 * types in `./types`, these carry the full editable detail plus the
 * server-authoritative lifecycle state (`status`, `is_mha_supported`,
 * `moderation_reason`, timestamps) that the employer reads but never sets — the
 * write path only sends {@link EmployerJobWrite} fields.
 *
 * Nested `screening_questions` are WRITABLE: on every create/update the provided
 * list FULLY REPLACES the job's questions (the serializer deletes and recreates
 * them). Partial question patching is intentionally out of MVP scope.
 */

/** Backend job lifecycle codes (spec §14.11). */
export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CLOSED"
  | "SUSPENDED"
  | "EXPIRED"
  | "ARCHIVED";

/** Backend employment-type codes (matches `Job.EmploymentType`). */
export type EmploymentTypeCode =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP"
  | "TEMPORARY";

/** Backend salary-period codes (matches `Job.SalaryPeriod`). */
export type SalaryPeriodCode = "HOURLY" | "DAILY" | "MONTHLY" | "YEARLY";

/** Backend screening-question type codes (matches `ScreeningQuestion.QuestionType`). */
export type ScreeningQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "YES_NO"
  | "SINGLE_CHOICE"
  | "NUMBER";

/** A screening question as read from / written to the owner serializer. */
export interface EmployerScreeningQuestion {
  /** Present on read; omitted on write (the server recreates questions). */
  id?: string | number;
  question: string;
  question_type: ScreeningQuestionType;
  is_required: boolean;
  /** Only meaningful for SINGLE_CHOICE; the server drops it otherwise. */
  options_json: string[];
  display_order: number;
}

/** The employer-editable job fields (EDITABLE_JOB_FIELDS) plus nested questions. */
export interface EmployerJobWrite {
  title: string;
  location: string;
  employment_type: EmploymentTypeCode;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: SalaryPeriodCode;
  salary_disclosed: boolean;
  description: string;
  requirements: string;
  /** ISO date (YYYY-MM-DD) or null. */
  application_deadline: string | null;
  listing_language: string;
  screening_questions: EmployerScreeningQuestion[];
}

/**
 * A full owner-facing job (EmployerJobSerializer): the editable fields plus the
 * read-only, server-authoritative lifecycle state.
 */
export interface EmployerJob extends EmployerJobWrite {
  id: string | number;
  slug: string;
  source_type: string;
  status: JobStatus;
  is_mha_supported: boolean;
  /** Admin-supplied reason when SUSPENDED/closed by MHA; otherwise null. */
  moderation_reason: string | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}
