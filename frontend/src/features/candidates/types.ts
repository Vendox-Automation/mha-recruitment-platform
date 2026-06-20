/**
 * Candidate domain types (spec §14.7 profile, §14.9 dashboard, §22.2 resume;
 * ADR-0001 §4, §5, §7). These mirror the Django candidate serializers in
 * `apps/candidates/serializers.py` and the dashboard snapshot in
 * `apps/candidates/selectors.py`.
 *
 * SECURITY: the resume is private personal data. None of these shapes carry a
 * file URL or storage path — only display metadata (`resume_original_name`,
 * `resume_uploaded_at`, `has_resume`). The bytes are read solely through the
 * permission-checked download endpoint (ADR-0001 §5).
 */

/** Resume parsing lifecycle (model `ResumeParsingStatus`). */
export type ResumeParsingStatus =
  | "NONE"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/** Per-field completion breakdown item (selector `_COMPLETION_CHECKS`). */
export interface ProfileCompletionItem {
  field: string;
  label: string;
  complete: boolean;
}

/** Deterministic profile-completion result (selector `profile_completion`). */
export interface ProfileCompletion {
  percent: number;
  complete: boolean;
  items: ProfileCompletionItem[];
  missing: string[];
}

/**
 * GET /candidate/profile/ — the signed-in candidate's own profile. Resume
 * fields are READ-ONLY here (managed via the resume endpoints) and never a URL.
 */
export interface CandidateProfile {
  // Editable basic profile + preference fields.
  full_name: string;
  phone: string;
  preferred_job_title: string;
  preferred_location: string;
  preferred_employment_type: string;
  // Read-only resume display metadata (never a URL/path).
  has_resume: boolean;
  resume_original_name: string;
  resume_uploaded_at: string | null;
  resume_parsing_status: ResumeParsingStatus;
  profile_completion: ProfileCompletion;
  updated_at: string;
}

/**
 * The subset of {@link CandidateProfile} that PATCH /candidate/profile/
 * accepts. Resume + audit fields are intentionally absent so a profile edit can
 * never attempt to write them (the backend treats them read-only regardless).
 */
export interface CandidateProfileUpdate {
  full_name: string;
  phone: string;
  preferred_job_title: string;
  preferred_location: string;
  preferred_employment_type: string;
}

/** Resume metadata returned by POST /candidate/resume/ (never the bytes). */
export interface ResumeMetadata {
  has_resume: boolean;
  original_name: string | null;
  uploaded_at: string | null;
  parsing_status: ResumeParsingStatus;
}

/** Resume summary embedded in the dashboard snapshot. */
export interface DashboardResume {
  has_resume: boolean;
  original_name: string | null;
  uploaded_at: string | null;
  parsing_status: ResumeParsingStatus;
}

/** Preference summary embedded in the dashboard snapshot. */
export interface DashboardPreferences {
  preferred_job_title: string;
  preferred_location: string;
  preferred_employment_type: string;
}

/**
 * Application statistics — Phase 6. The backend reports honest zeros/empties
 * here for now (spec §22.3); the frontend renders them honestly, never
 * fabricating counts.
 */
export interface DashboardApplications {
  total: number;
  submitted: number;
  in_review: number;
  shortlisted: number;
  rejected: number;
  recent: unknown[];
}

/** GET /candidate/dashboard/ — the candidate's dashboard snapshot (§14.9). */
export interface CandidateDashboard {
  profile_completion: ProfileCompletion;
  resume: DashboardResume;
  preferences: DashboardPreferences;
  applications: DashboardApplications;
  saved_jobs: { total: number };
}
