/**
 * Support-request domain types (spec §14.5, §21.3).
 *
 * Mirrors `apps/support/serializers.py`. The create payload matches
 * `SupportRequestCreateSerializer`; the read shape matches
 * `SupportRequestSerializer` (candidate-facing — no staff fields, and the
 * attachment is exposed as metadata only, never a URL: ADR-0001 §5).
 */

/** Backend `SupportCategory` enum values (the API contract). */
export type SupportCategory =
  | "JOB_APPLICATION"
  | "RESUME"
  | "CAREER_DIRECTION"
  | "APPLICATION_STATUS"
  | "OTHER";

/** Backend `SupportStatus` enum values. */
export type SupportStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/** The intake fields a requester fills in (the attachment is sent separately). */
export interface SupportRequestInput {
  name: string;
  email: string;
  phone?: string;
  category: SupportCategory;
  message: string;
  /** Optional public job slug giving the request context. */
  job?: string;
  /** Optional private attachment (PDF/DOCX), sent as multipart `file`. */
  file?: File | null;
}

/** A candidate's own support request (SupportRequestSerializer). */
export interface SupportRequest {
  id: string;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  has_attachment: boolean;
  resume_original_name: string;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}
