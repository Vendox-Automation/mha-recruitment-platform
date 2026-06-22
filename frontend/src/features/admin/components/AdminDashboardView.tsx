"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  ErrorState,
  LinkButton,
  Skeleton,
} from "@/components/ui";

import { ADMIN_SUMMARY_KEY } from "../queryKeys";
import { getAdminSummary } from "../service";
import type { AdminSummary } from "../types";

/**
 * Admin dashboard summary (admin scope). Loads the approval counts and surfaces
 * them as a calm metric row — pending registrations are highlighted as the work
 * that needs attention, with a direct CTA into the employer queue. Owns the
 * loading (skeletons), error/retry, and honest zero states (a zero count is
 * shown plainly, never hidden or faked).
 */
export function AdminDashboardView() {
  const t = useTranslations("admin.dashboard");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: ADMIN_SUMMARY_KEY,
    queryFn: () => getAdminSummary(locale),
  });

  if (query.isLoading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => query.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const summary = query.data;

  return (
    <div className="flex flex-col gap-6">
      {/* Pending — the work that needs a decision (highlighted). */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="type-eyebrow text-brand-primary">
            {t("pending.eyebrow")}
          </p>
          <p className="type-display text-text-primary">
            {summary.pending_employers}
          </p>
          <p className="type-body-sm text-text-secondary">
            {summary.pending_employers === 0
              ? t("pending.zero")
              : t("pending.body", { count: summary.pending_employers })}
          </p>
        </div>
        <LinkButton href="/admin/employers" variant="primary" size="md">
          {t("pending.cta")}
        </LinkButton>
      </Card>

      {/* The remaining lifecycle counts. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("metrics.approved")} value={summary.approved_employers} />
        <MetricCard label={t("metrics.suspended")} value={summary.suspended_employers} />
        <MetricCard label={t("metrics.rejected")} value={summary.rejected_employers} />
        <MetricCard label={t("metrics.total")} value={summary.total_employers} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="type-caption text-text-secondary">{label}</p>
      <p className="type-heading-1 text-text-primary">{value}</p>
    </Card>
  );
}

export type { AdminSummary };
