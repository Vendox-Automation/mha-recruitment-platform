/**
 * Central API client (spec §18.7.13, ADR-0001 §7).
 *
 * All backend access flows through this module so base URL, credentials, the
 * CSRF header, locale negotiation, and error normalisation live in ONE place
 * instead of scattered `fetch` calls. Feature services build on top of it.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Normalised API error shape (ADR-0001 §7.2). */
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  requestId?: string;
  status: number;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
    this.status = error.status;
    this.fields = error.fields;
    this.requestId = error.requestId;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialisable body; FormData is passed through untouched. */
  body?: unknown;
  /** Active locale, sent as Accept-Language for localised messages (§7.3). */
  locale?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, locale, headers, method = "GET", ...rest } = options;
  const requestHeaders = new Headers(headers);

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (locale) {
    requestHeaders.set("Accept-Language", locale);
  }
  // CSRF for unsafe methods (ADR-0001 §4.1).
  if (!SAFE_METHODS.has(method.toUpperCase())) {
    const csrf = readCookie("csrftoken");
    if (csrf) requestHeaders.set("X-CSRFToken", csrf);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    method,
    headers: requestHeaders,
    credentials: "include",
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError({
      code: payload?.code ?? "server_error",
      message: payload?.message ?? "Something went wrong. Please try again.",
      fields: payload?.fields,
      requestId: payload?.request_id,
      status: response.status,
    });
  }

  return payload as T;
}

export { API_BASE_URL };
