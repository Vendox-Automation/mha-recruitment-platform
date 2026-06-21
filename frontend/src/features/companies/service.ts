/**
 * Public companies feature service (spec §14.4; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client. AllowAny endpoints — only
 * approved employers are ever returned by the backend.
 */

import { apiFetch } from "@/lib/api/client";

import type {
  CompanySearchParams,
  Paginated,
  PublicCompanyDetail,
  PublicCompanyListItem,
} from "./types";

/** Build a clean `/companies/` query string, omitting an empty search term. */
export function buildCompanySearchQuery(params: CompanySearchParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page));
  return query.toString();
}

/** GET a page of approved companies. */
export function listCompanies(
  params: CompanySearchParams,
  locale?: string,
): Promise<Paginated<PublicCompanyListItem>> {
  return apiFetch<Paginated<PublicCompanyListItem>>(
    `/companies/?${buildCompanySearchQuery(params)}`,
    { method: "GET", locale },
  );
}

/** GET a single approved company by slug (404 when not public). */
export function getCompany(
  slug: string,
  locale?: string,
): Promise<PublicCompanyDetail> {
  return apiFetch<PublicCompanyDetail>(
    `/companies/${encodeURIComponent(slug)}/`,
    { method: "GET", locale },
  );
}
