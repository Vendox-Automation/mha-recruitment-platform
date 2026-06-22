import type { User, UserRole } from "@/features/auth/types";

/**
 * Role-aware post-auth destination (spec §14.6 "correct role-aware redirect").
 *
 * Returns a locale-RELATIVE path (e.g. `/candidate/dashboard`); the caller uses
 * the locale-aware router from `@/i18n/navigation`, which prefixes the active
 * locale so language is preserved (ADR-0001 §4.1, spec §17.2).
 *
 *   CANDIDATE              -> /candidate/dashboard
 *   EMPLOYER (approved)    -> /employer/dashboard
 *   EMPLOYER (pending/…)   -> /employer/pending
 *   ADMIN                  -> /  (admins use Django Admin, not this app)
 */
export function destinationForUser(user: User): string {
  switch (user.role) {
    case "CANDIDATE":
      return "/candidate/dashboard";
    case "EMPLOYER":
      return user.profile?.approval_status === "APPROVED"
        ? "/employer/dashboard"
        : "/employer/pending";
    case "ADMIN":
    default:
      return "/";
  }
}

/** True when an employer account is approved to use the full workspace. */
export function isApprovedEmployer(user: User): boolean {
  return user.role === "EMPLOYER" && user.profile?.approval_status === "APPROVED";
}

/** Convenience guard: does the user hold the required role? */
export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Best display name for the signed-in user: the candidate's full name or the
 * employer's company name from the `/auth/me/` profile, falling back to email.
 */
export function userDisplayName(user: User): string {
  const candidate = user.profile?.full_name?.trim();
  const employer = user.profile?.company_name?.trim();
  return candidate || employer || user.email;
}

/**
 * Administration lives in Django Admin, not this Next app (CLAUDE.md: "Django
 * Admin for internal administration"). Admins are sent here on sign-in and via
 * the header — it is an EXTERNAL URL, so callers navigate with a full-page load
 * / plain anchor, not the locale-aware router/Link. Override per environment
 * with `NEXT_PUBLIC_ADMIN_URL` (e.g. a backend tunnel when using ngrok).
 */
export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:8000/admin/";

/** True when the user administers via Django Admin rather than an in-app area. */
export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN";
}
