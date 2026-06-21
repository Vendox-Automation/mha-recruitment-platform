/**
 * Application domain types (spec §10.1, §14.9, §15.4; ADR-0001 §4, §7).
 *
 * These mirror the CANDIDATE-facing serializers in
 * `apps/applications/serializers.py` (`ApplyInputSerializer`,
 * `ApplicationListSerializer`, `ApplicationDetailSerializer`,
 * `StatusHistorySerializer`, `ApplicationAnswerSerializer`).
 *
 * SECURITY (spec §15.4, §22.1): the candidate shapes NEVER carry
 * `employer_private_notes` or the raw resume-snapshot path/URL — only the safe
 * display metadata (`has_resume_snapshot`, `resume_snapshot_name`).
 */

/** The seven application stages (model `Application.Status`). */
export type ApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFERED"
  | "HIRED"
  | "REJECTED";

/** Screening-question control kinds (model `ScreeningQuestion.QuestionType`). */
export type ScreeningQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "YES_NO"
  | "SINGLE_CHOICE"
  | "NUMBER";

/** Who moved the application to a status (StatusHistorySerializer.source). */
export type StatusSource = "employer" | "platform" | "candidate";

/** Compact job block embedded in candidate application shapes. */
export interface ApplicationJobSummary {
  title: string;
  slug: string;
  company_name: string | null;
  location: string | null;
  employment_type: string;
}

/** A single screening answer on the application detail. */
export interface ApplicationAnswer {
  question: {
    id: string | number;
    question: string;
    question_type: string;
  };
  answer_text: string | null;
  answer_json: unknown;
}

/** One transition in the application status timeline. */
export interface ApplicationStatusHistoryEntry {
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  change_note: string | null;
  created_at: string;
  source: StatusSource;
}

/**
 * GET /candidate/applications/ row (ApplicationListSerializer).
 *
 * Note: the backend no longer emits `status_display`; the frontend maps the
 * `status` code to a localised label via `status.ts` so both locales stay at
 * parity (Phase 11).
 */
export interface ApplicationListItem {
  id: string | number;
  job: ApplicationJobSummary;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
}

/** GET /candidate/applications/{id}/ (ApplicationDetailSerializer). */
export interface ApplicationDetail extends ApplicationListItem {
  cover_letter: string;
  answers: ApplicationAnswer[];
  status_history: ApplicationStatusHistoryEntry[];
  has_resume_snapshot: boolean;
  resume_snapshot_name: string | null;
}

/** DRF page-number pagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Body of POST /jobs/{slug}/apply/. `answers` is a map of screening-question id
 * → submitted value; the exact value shape per type is built by
 * {@link buildAnswersPayload}.
 */
export interface ApplyPayload {
  cover_letter?: string;
  answers?: Record<string, unknown>;
}
