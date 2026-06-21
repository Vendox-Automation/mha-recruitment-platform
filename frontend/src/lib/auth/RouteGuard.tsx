"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";
import { LoadingState } from "@/components/ui";
import type { UserRole } from "@/features/auth/types";

import { useAuth } from "./AuthProvider";
import { isApprovedEmployer } from "./redirects";

export interface RouteGuardProps {
  /** Role required to view the guarded area. */
  requireRole: UserRole;
  /**
   * When true (employer area), an authenticated-but-not-approved employer is
   * sent to `/employer/pending` instead of seeing the workspace (spec §8.3).
   */
  requireApprovedEmployer?: boolean;
  children: ReactNode;
}

/**
 * Client-side route guard for protected areas (ADR-0001 §4.1). Guards are UX
 * only — every sensitive backend query is independently server-scoped, so this
 * never substitutes for backend authorization. It exists to avoid flashing
 * protected chrome at the wrong audience and to route people sensibly.
 *
 * Behaviour:
 *   - while `/auth/me/` resolves: show a calm LoadingState (no chrome flash).
 *   - anonymous:            redirect to `/sign-in`.
 *   - wrong role:           redirect that role to its own home.
 *   - pending employer in a workspace route: redirect to `/employer/pending`.
 *
 * Redirects use the locale-aware router so the active language is preserved.
 */
export function RouteGuard({
  requireRole,
  requireApprovedEmployer,
  children,
}: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("auth.guard");
  const tCommon = useTranslations("common.states");

  // Decide the redirect target (if any) from the resolved session.
  let redirectTo: string | null = null;
  if (!isLoading) {
    if (user === null) {
      redirectTo = "/sign-in";
    } else if (user.role !== requireRole) {
      // Wrong role: send people to their own area rather than a dead end.
      redirectTo =
        user.role === "CANDIDATE"
          ? "/candidate/dashboard"
          : user.role === "EMPLOYER"
            ? isApprovedEmployer(user)
              ? "/employer/dashboard"
              : "/employer/pending"
            : "/";
    } else if (requireApprovedEmployer && !isApprovedEmployer(user)) {
      redirectTo = "/employer/pending";
    }
  }

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  // Loading or about-to-redirect: never render protected children.
  if (isLoading || redirectTo) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <LoadingState
          title={t("checkingTitle")}
          description={t("checkingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </div>
    );
  }

  return <>{children}</>;
}
