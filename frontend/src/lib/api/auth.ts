/**
 * Typed auth service (spec §14.6–14.8, §15.1; ADR-0001 §4, §7).
 *
 * Thin wrappers over the central API client (`lib/api/client`). All session
 * handling is delegated to Django's HttpOnly session cookie — this module never
 * reads, writes, or stores a token in localStorage/sessionStorage (ADR-0001
 * §4: "no long-lived token in browser storage").
 *
 * The CSRF flow (ADR-0001 §4.1):
 *   1. `ensureCsrf()` primes the `csrftoken` cookie (GET /auth/csrf/).
 *   2. The central client reads that cookie and attaches `X-CSRFToken` to every
 *      unsafe request automatically — callers do nothing extra.
 */

import { apiFetch } from "./client";
import type {
  CandidateRegisterInput,
  EmployerRegisterInput,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  User,
} from "@/features/auth/types";

/** Prime the `csrftoken` cookie before the first mutation (ADR-0001 §4.1). */
export function ensureCsrf(locale?: string): Promise<void> {
  return apiFetch<void>("/auth/csrf/", { method: "GET", locale });
}

/** Sign in with credentials; on success Django sets the session cookie. */
export function login(input: LoginInput, locale?: string): Promise<User> {
  return apiFetch<User>("/auth/login/", {
    method: "POST",
    body: input,
    locale,
  });
}

export function registerCandidate(
  input: CandidateRegisterInput,
  locale?: string,
): Promise<User> {
  return apiFetch<User>("/auth/register/candidate/", {
    method: "POST",
    body: input,
    locale,
  });
}

export function registerEmployer(
  input: EmployerRegisterInput,
  locale?: string,
): Promise<User> {
  return apiFetch<User>("/auth/register/employer/", {
    method: "POST",
    body: input,
    locale,
  });
}

/** Clear the session server-side (returns 204). */
export function logout(locale?: string): Promise<void> {
  return apiFetch<void>("/auth/logout/", { method: "POST", locale });
}

/** Single source of session/role/status truth (ADR-0001 §4.1). 401 if anon. */
export function getMe(locale?: string): Promise<User> {
  return apiFetch<User>("/auth/me/", { method: "GET", locale });
}

/**
 * Session revalidation / CSRF prime (ADR-0001 §4.1 [OVERRIDE]). Under session
 * auth there is no token to refresh; this returns the current `/auth/me/` state
 * and ensures a fresh CSRF cookie. Never mints a long-lived token.
 */
export function refresh(locale?: string): Promise<User> {
  return apiFetch<User>("/auth/refresh/", { method: "POST", locale });
}

/** Always returns 200 regardless of whether the email exists (anti-enumeration). */
export function requestPasswordReset(
  input: PasswordResetRequestInput,
  locale?: string,
): Promise<void> {
  return apiFetch<void>("/auth/password-reset/request/", {
    method: "POST",
    body: input,
    locale,
  });
}

export function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  locale?: string,
): Promise<void> {
  return apiFetch<void>("/auth/password-reset/confirm/", {
    method: "POST",
    body: input,
    locale,
  });
}
