/**
 * Public career-intelligence insights service (spec §5.3, §13.5, §21.9).
 *
 * Thin typed wrapper over the central API client. The endpoint is `AllowAny`
 * (no session required) and returns only reliable, non-identifying aggregates
 * plus administrator-curated MHA insight cards — small-group entries are
 * withheld by the backend selector, never the client.
 */

import { apiFetch } from "@/lib/api/client";

import type { PublicInsights } from "./publicInsightsTypes";

/** GET the public insights payload (real aggregates + curated MHA insights). */
export function getPublicInsights(locale?: string): Promise<PublicInsights> {
  return apiFetch<PublicInsights>("/insights/public/", {
    method: "GET",
    locale,
  });
}
