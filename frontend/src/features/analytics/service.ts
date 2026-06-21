/**
 * Analytics feature service (spec §15.8, §21.8; ADR-0001 §3.2, §7).
 *
 * Thin typed wrapper over the central API client (`lib/api/client`). The endpoint
 * is `IsApprovedEmployer` and strictly scoped by the backend to the requesting
 * employer's OWN jobs — there is no cross-employer or individual-candidate data.
 * The session cookie is sent by the central client; no token is held in JS.
 */

import { apiFetch } from "@/lib/api/client";

import type { EmployerAnalytics } from "./types";

/** GET the signed-in employer's own-job analytics. */
export function getEmployerAnalytics(
  locale?: string,
): Promise<EmployerAnalytics> {
  return apiFetch<EmployerAnalytics>("/employer/analytics/", {
    method: "GET",
    locale,
  });
}
