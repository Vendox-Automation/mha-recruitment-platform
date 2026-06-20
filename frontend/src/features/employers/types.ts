/**
 * Employer domain types (spec §14.8 approval, §14.4/§14.10 company profile,
 * data model §18.x EmployerProfile; ADR-0001 §4, §7).
 *
 * These mirror the Django `EmployerProfile` serializer. The approval lifecycle
 * fields (`approval_status`, `approval_reason`, `approved_at`, `suspended_at`)
 * are READ-ONLY on the frontend: Django owns approval (CLAUDE.md §10), so the
 * profile-update form never sends them. The employer edits only the company
 * details candidates see plus their own contact fields.
 */

import type { EmployerApprovalStatus } from "@/features/auth/types";

export type { EmployerApprovalStatus };

/**
 * GET /employer/profile/ — the employer's own profile. Approval fields are
 * read-only and surface state; the remaining fields are editable via PATCH.
 */
export interface EmployerProfile {
  // Editable contact + identity (spec §14.8 registration fields).
  company_name: string;
  contact_person: string;
  phone: string;
  // Editable public company details (spec §14.4 company page, data model).
  company_summary: string;
  website: string;
  industry: string;
  company_size: string;
  company_location: string;
  culture_text: string;
  benefits_text: string;
  // Read-only approval lifecycle (Django-authoritative, spec §8.3–8.5).
  approval_status: EmployerApprovalStatus;
  approval_reason: string | null;
  approved_at: string | null;
  suspended_at: string | null;
}

/**
 * The subset of {@link EmployerProfile} a PATCH /employer/profile/ accepts.
 * Approval fields are intentionally absent — the backend ignores them, and the
 * type keeps callers from ever attempting to send them.
 */
export interface EmployerProfileUpdate {
  company_name: string;
  contact_person: string;
  phone: string;
  company_summary: string;
  website: string;
  industry: string;
  company_size: string;
  company_location: string;
  culture_text: string;
  benefits_text: string;
}

/**
 * GET /employer/approval-status/ — a lightweight status payload the pending
 * screen polls so the gate can render the right state (spec §14.8) without
 * loading the full editable profile first.
 */
export interface EmployerApprovalState {
  approval_status: EmployerApprovalStatus;
  approval_reason: string | null;
  can_publish: boolean;
  company_name: string;
  approved_at: string | null;
  suspended_at: string | null;
}
