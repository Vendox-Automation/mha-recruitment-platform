/**
 * Support feature service (spec §14.5, §21.3; ADR-0001 §3.2, §7).
 *
 * Thin typed wrappers over the central API client (`lib/api/client`). No raw
 * `fetch` lives outside `lib/api`.
 *
 * Intake (`createSupportRequest`) is `AllowAny` — guests AND signed-in
 * candidates use it. The optional attachment makes the request `multipart/
 * form-data`: we build a `FormData` body (field name `file`, matching
 * `request.FILES.get("file")`) and the central client passes it through without
 * forcing a JSON content-type. The attachment is PRIVATE (ADR-0001 §5) and is
 * never returned as a URL.
 *
 * History (`listMySupportRequests`) is `IsCandidate` and scoped to the signed-in
 * candidate's own requests by the backend.
 */

import { apiFetch } from "@/lib/api/client";

import type { SupportRequest, SupportRequestInput } from "./types";

/**
 * Submit a career-support request. Always sent as multipart so the same code path
 * serves requests with and without an attachment.
 */
export function createSupportRequest(
  input: SupportRequestInput,
  locale?: string,
): Promise<SupportRequest> {
  const body = new FormData();
  body.append("name", input.name);
  body.append("email", input.email);
  if (input.phone) body.append("phone", input.phone);
  body.append("category", input.category);
  body.append("message", input.message);
  if (input.job) body.append("job", input.job);
  if (input.file) body.append("file", input.file);

  return apiFetch<SupportRequest>("/support-requests/", {
    method: "POST",
    body,
    locale,
  });
}

/** GET the signed-in candidate's own support requests (most-recent first). */
export function listMySupportRequests(
  locale?: string,
): Promise<SupportRequest[]> {
  return apiFetch<SupportRequest[]>("/candidate/support-requests/", {
    method: "GET",
    locale,
  });
}
