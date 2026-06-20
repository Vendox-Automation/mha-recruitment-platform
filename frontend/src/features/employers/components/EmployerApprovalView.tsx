"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { PageContainer, PageHeader } from "@/components/layout";
import {
  Alert,
  Badge,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  PermissionDeniedState,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useRouter } from "@/i18n/navigation";

import { getApprovalStatus, getEmployerProfile } from "../service";
import type { EmployerApprovalStatus } from "../types";
import { CompanyProfileForm } from "./CompanyProfileForm";

/** Stable query keys so the gate and profile editor share cache. */
const APPROVAL_STATUS_KEY = ["employer", "approval-status"] as const;
const EMPLOYER_PROFILE_KEY = ["employer", "profile"] as const;

const STATUS_BADGE: Record<EmployerApprovalStatus, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "approved",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

/**
 * Catch-all employer approval screen for NON-APPROVED employers — PENDING,
 * REJECTED, and SUSPENDED (spec §14.8, §8.3–8.5). Reachable from the employer
 * layout (any approval status); the approved workspace pages redirect here via
 * `EmployerWorkspaceGuard` when an employer is not approved.
 *
 * Data: `/employer/approval-status/` decides the rendered state; the editable
 * states (PENDING / REJECTED) also load `/employer/profile/` to seed the
 * correct-and-resubmit form. Suspended employers get a notice + limited account
 * info only — no editing of restricted data (spec §8.5).
 *
 * States handled: loading (status resolving), permission-denied (non-employer /
 * 403), error (with retry), and the three approval branches. An APPROVED
 * employer who lands here is redirected to the workspace.
 */
export function EmployerApprovalView() {
  const t = useTranslations("employer");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const isEmployer = user?.role === "EMPLOYER";

  const statusQuery = useQuery({
    queryKey: APPROVAL_STATUS_KEY,
    queryFn: () => getApprovalStatus(locale),
    enabled: isEmployer,
  });

  const status = statusQuery.data?.approval_status;
  const editable = status === "PENDING" || status === "REJECTED";

  // The editable branches need the full profile to seed the form; suspended /
  // approved branches never fetch it.
  const profileQuery = useQuery({
    queryKey: EMPLOYER_PROFILE_KEY,
    queryFn: () => getEmployerProfile(locale),
    enabled: isEmployer && editable,
  });

  // An approved employer should not sit on the pending screen (spec §8.4).
  useEffect(() => {
    if (status === "APPROVED") {
      router.replace("/employer/dashboard");
    }
  }, [status, router]);

  // Permission: only employers see this screen. Non-employers (or a 403) get a
  // permission-denied state rather than employer chrome.
  const forbidden =
    (!authLoading && user !== null && !isEmployer) ||
    (statusQuery.error instanceof ApiRequestError &&
      statusQuery.error.status === 403);

  if (forbidden) {
    return (
      <PageContainer width="narrow" className="py-6">
        <PermissionDeniedState
          title={tCommon("permissionTitle")}
          description={tCommon("permissionDescription")}
          action={
            <LinkButton href="/sign-in" variant="secondary" size="sm">
              {t("approval.signInOther")}
            </LinkButton>
          }
        />
      </PageContainer>
    );
  }

  if (authLoading || statusQuery.isLoading || status === "APPROVED") {
    return (
      <PageContainer width="narrow" className="py-6">
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </PageContainer>
    );
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <PageContainer width="narrow" className="py-6">
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => statusQuery.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </PageContainer>
    );
  }

  const state = statusQuery.data;
  const contactAction = (
    <LinkButton href="/career-support" variant="ghost" size="sm">
      {t("pending.contactCta")}
    </LinkButton>
  );

  // Header copy varies by branch.
  const header =
    status === "REJECTED"
      ? { title: t("pending.rejected.title"), description: t("pending.rejected.body") }
      : status === "SUSPENDED"
        ? {
            title: t("suspended.title"),
            description: t("suspended.body"),
          }
        : { title: t("pending.title"), description: t("pending.description") };

  return (
    <PageContainer width="narrow" className="flex flex-col gap-8 py-2">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={header.title}
        description={header.description}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="type-label text-text-primary">
            {t("pending.statusLabel")}
          </span>
          <Badge tone={STATUS_BADGE[status ?? "PENDING"]} withDot>
            {t(`approval.statusBadge.${status}`)}
          </Badge>
        </div>

        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="type-caption text-text-secondary">
              {t("approval.companyLabel")}
            </dt>
            <dd className="type-body-sm text-text-primary">
              {state.company_name}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="type-caption text-text-secondary">
              {t("approval.accountLabel")}
            </dt>
            <dd className="type-body-sm text-text-primary">{user?.email}</dd>
          </div>
        </dl>

        {status === "PENDING" ? (
          <div className="flex flex-col gap-2">
            <h2 className="type-heading-3 text-text-primary">
              {t("pending.nextStepTitle")}
            </h2>
            <p className="type-body-sm text-text-secondary">
              {t("pending.nextStepBody")}
            </p>
          </div>
        ) : null}

        {status === "REJECTED" ? (
          <Alert tone="danger" title={t("pending.rejected.reasonTitle")}>
            {state.approval_reason
              ? state.approval_reason
              : t("pending.rejected.reasonFallback")}
          </Alert>
        ) : null}

        {status === "SUSPENDED" ? (
          <Alert tone="warning" title={t("suspended.noticeTitle")}>
            {t("suspended.noticeBody")}
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">{contactAction}</div>
      </Card>

      {editable ? (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="type-heading-3 text-text-primary">
              {status === "REJECTED"
                ? t("pending.rejected.editTitle")
                : t("pending.editTitle")}
            </h2>
            <p className="type-body-sm text-text-secondary">
              {status === "REJECTED"
                ? t("pending.rejected.editBody")
                : t("pending.editBody")}
            </p>
          </div>

          {profileQuery.isLoading ? (
            <LoadingState
              compact
              title={tCommon("loadingTitle")}
              spinnerLabel={tCommon("loadingSpinner")}
            />
          ) : profileQuery.isError || !profileQuery.data ? (
            <ErrorState
              compact
              title={tCommon("errorTitle")}
              description={tCommon("errorDescription")}
              action={
                <button
                  type="button"
                  className="type-body-sm font-semibold text-brand-primary hover:underline"
                  onClick={() => profileQuery.refetch()}
                >
                  {tCommon("retry")}
                </button>
              }
            />
          ) : (
            <CompanyProfileForm
              profile={profileQuery.data}
              submitLabel={
                status === "REJECTED"
                  ? t("pending.rejected.resubmit")
                  : undefined
              }
              onSaved={() => {
                // A resubmit may have changed the server-side status; refresh
                // the gate so the screen reflects the new decision.
                statusQuery.refetch();
              }}
            />
          )}
        </Card>
      ) : null}
    </PageContainer>
  );
}
