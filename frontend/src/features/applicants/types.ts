/**
 * Employer applicant-workspace domain types (spec §14.10, §14.12; ADR-0001 §7).
 *
 * These mirror the EMPLOYER-facing serializers in
 * `apps/applications/employer_serializers.py` and the dashboard selector
 * `apps/applications/selectors.py:employer_dashboard_snapshot`.
 *
 * SECURITY (spec §22.1): the employer surface DOES expose the applicant's
 * review-relevant contact/profile fields and the employer's OWN private notes
 * (`employer_private_notes`), but never the raw resume path/URL — the resume is
 * reachable only through the permission-checked download endpoint
 * ({@link import('./service').applicantResumeUrl}). It carries no public URL.
 */

import type {
  ApplicationAnswer,
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  Paginated,
} from "@/features/applications";

export type { ApplicationStatus, Paginated };

/** Minimal owned-job context on an applicant row (_EmployerJobMiniSerializer). */
export interface EmployerApplicantJob {
  id: string;
  title: string;
  slug: string;
  status: string;
}

/**
 * One applicant row in the table / kanban / split list
 * (EmployerApplicationListSerializer). Note the list serializer flattens the
 * candidate to `candidate_name` / `candidate_title`; the nested profile arrives
 * only on the detail shape ({@link EmployerApplicantDetail}).
 */
export interface EmployerApplicantListItem {
  id: string;
  job: EmployerApplicantJob;
  candidate_name: string;
  candidate_title: string;
  status: ApplicationStatus;
  /** Backend label — NOT used for display; the frontend maps status → text. */
  status_display: string;
  has_resume_snapshot: boolean;
  submitted_at: string;
  updated_at: string;
}

/** Review-relevant slice of the applicant's profile (_ApplicantProfileSerializer). */
export interface EmployerApplicantProfile {
  full_name: string;
  phone: string;
  preferred_job_title: string;
  preferred_location: string;
  preferred_employment_type: string;
}

/**
 * Full applicant detail for an owned-job application
 * (EmployerApplicationDetailSerializer). Includes the employer-only private
 * notes and the candidate profile summary, answers, cover letter, current
 * status and full history.
 */
export interface EmployerApplicantDetail {
  id: string;
  job: EmployerApplicantJob;
  candidate: EmployerApplicantProfile;
  status: ApplicationStatus;
  status_display: string;
  cover_letter: string;
  answers: ApplicationAnswer[];
  status_history: ApplicationStatusHistoryEntry[];
  employer_private_notes: string;
  has_resume_snapshot: boolean;
  resume_snapshot_name: string | null;
  submitted_at: string;
  updated_at: string;
}

/** Body of PATCH /employer/applications/{id}/status/. */
export interface StatusChangeInput {
  status: ApplicationStatus;
  change_note?: string;
}

/** Query parameters accepted by the employer applicant list endpoints. */
export interface ApplicantListParams {
  job?: string;
  status?: ApplicationStatus | "";
  search?: string;
  ordering?: string;
}

/** One active-job row on the employer dashboard (selector `active_jobs`). */
export interface EmployerDashboardJob {
  id: string;
  title: string;
  slug: string;
  status: string;
  application_deadline: string | null;
  application_count: number;
  new_applicant_count: number;
}

/** Attention queue counts (selector `attention`). */
export interface EmployerDashboardAttention {
  new_applicants: number;
  jobs_near_deadline: number;
  draft_jobs: number;
}

/** GET /employer/dashboard/ (employer_dashboard_snapshot). All real counts. */
export interface EmployerDashboard {
  attention: EmployerDashboardAttention;
  active_jobs: EmployerDashboardJob[];
  /** Count per stage across all owned jobs, keyed by the seven statuses. */
  pipeline: Record<ApplicationStatus, number>;
  totals: {
    jobs: number;
    applications: number;
  };
}
