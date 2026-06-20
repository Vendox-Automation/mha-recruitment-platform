/**
 * Employer feature service (spec §14.8 approval, §14.4/§14.10 company profile;
 * ADR-0001 §3.2 features/<x>, §7 API contract).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api` (ADR-0001 §3.2 ownership rule); these just
 * give the employer screens typed shapes and a single place that knows the
 * employer endpoints. Session + CSRF are handled by the central client.
 */

import { apiFetch } from "@/lib/api/client";

import type {
  EmployerApprovalState,
  EmployerProfile,
  EmployerProfileUpdate,
} from "./types";

/** GET the signed-in employer's own profile (editable + read-only fields). */
export function getEmployerProfile(locale?: string): Promise<EmployerProfile> {
  return apiFetch<EmployerProfile>("/employer/profile/", {
    method: "GET",
    locale,
  });
}

/**
 * PATCH the allowed company-profile fields. Approval fields are not part of
 * {@link EmployerProfileUpdate}, so they can never be sent; the backend ignores
 * them regardless (Django owns approval, CLAUDE.md §10).
 */
export function updateEmployerProfile(
  input: Partial<EmployerProfileUpdate>,
  locale?: string,
): Promise<EmployerProfile> {
  return apiFetch<EmployerProfile>("/employer/profile/", {
    method: "PATCH",
    body: input,
    locale,
  });
}

/** GET the lightweight approval-status payload for the pending gate. */
export function getApprovalStatus(
  locale?: string,
): Promise<EmployerApprovalState> {
  return apiFetch<EmployerApprovalState>("/employer/approval-status/", {
    method: "GET",
    locale,
  });
}
