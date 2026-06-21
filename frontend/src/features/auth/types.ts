/**
 * Shared auth domain types (spec §14.6–14.8, §15.1; ADR-0001 §4).
 *
 * These mirror the `/auth/me/` payload the Django backend returns. The frontend
 * treats `/auth/me/` as the single source of truth for session, role, and
 * status (ADR-0001 §4.1) — there is NO token persisted anywhere; the session
 * lives only in the HttpOnly cookie set by Django.
 */

export type UserRole = "CANDIDATE" | "EMPLOYER" | "ADMIN";

export type UserStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "DEACTIVATED";

/** Employer approval lifecycle (spec §8.3). Present on the employer profile. */
export type EmployerApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

/**
 * Profile sub-object. Shape varies by role and is intentionally permissive at
 * this phase — only the fields the auth flow reads (employer `approval_status`)
 * are typed explicitly; everything else is preserved for later phases.
 */
export interface UserProfile {
  approval_status?: EmployerApprovalStatus;
  [key: string]: unknown;
}

/** The `/auth/me/` payload (spec §15.1). */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  preferred_locale: string;
  is_email_verified: boolean;
  profile: UserProfile | null;
}

/** Request bodies for the auth endpoints (ADR-0001 §7). */
export interface LoginInput {
  email: string;
  password: string;
}

export interface CandidateRegisterInput {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  preferred_job_title: string;
  preferred_location?: string;
  preferred_employment_type?: string;
  preferred_locale?: string;
}

export interface EmployerRegisterInput {
  email: string;
  password: string;
  company_name: string;
  contact_person: string;
  phone: string;
  preferred_locale?: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  uid: string;
  token: string;
  new_password: string;
}
