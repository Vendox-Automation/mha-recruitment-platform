/**
 * Admin domain types (product-owner-approved admin scope; ADR-0001 §4, §7).
 *
 * These mirror the ADMIN-facing serializers the Django backend exposes under
 * `/admin/...`. The admin area is gated to ADMIN sessions client-side (UX only)
 * and server-side by Django (authoritative). No tokens are persisted here — the
 * session lives only in the HttpOnly cookie (ADR-0001 §4.1).
 */

/** Employer approval lifecycle as surfaced by the admin endpoints (spec §8.3). */
export type AdminEmployerStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

/** The status filter the queue offers, including the "All" pseudo-value. */
export type AdminEmployerStatusFilter = "ALL" | AdminEmployerStatus;

/** GET /admin/summary/ — approval counts for the admin dashboard. */
export interface AdminSummary {
  pending_employers: number;
  approved_employers: number;
  suspended_employers: number;
  rejected_employers: number;
  total_employers: number;
}

/** GET /admin/employers/ row (admin employer list serializer). */
export interface AdminEmployerListItem {
  id: string | number;
  company_name: string;
  contact_person: string;
  email: string;
  approval_status: AdminEmployerStatus;
  industry: string | null;
  company_location: string | null;
  created_at: string;
  approved_at: string | null;
  suspended_at: string | null;
}

/** GET /admin/employers/{id}/ — the list row plus the review detail fields. */
export interface AdminEmployerDetail extends AdminEmployerListItem {
  approval_reason: string | null;
  approved_by_email: string | null;
  website: string | null;
  company_summary: string | null;
  company_size: string | null;
}

/** DRF page-number pagination envelope (DefaultPagination). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Query parameters for the employer queue. */
export interface AdminEmployerListParams {
  /** Status filter; omitted from the request when "ALL". */
  status?: AdminEmployerStatusFilter;
  /** Free-text search across company / contact / email. */
  search?: string;
  /** 1-based page index. */
  page?: number;
}
