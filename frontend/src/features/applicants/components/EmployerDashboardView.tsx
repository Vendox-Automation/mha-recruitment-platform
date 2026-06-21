"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
} from "@/components/ui";
import { ALL_STATUSES } from "@/features/applications";
import { formatDate } from "@/features/applications";
import { Link } from "@/i18n/navigation";

import { statusLabelKey } from "../board";
import { EMPLOYER_DASHBOARD_KEY } from "../queryKeys";
import { getEmployerDashboard } from "../service";

/**
 * Employer dashboard (spec §14.10). A calm command centre wired to real,
 * employer-scoped counts: an attention queue (new applicants, jobs near
 * deadline, draft jobs) with deep links, an active-jobs summary (status,
 * deadline, application + new counts, each linking to that job's applicant
 * workspace), and the candidate pipeline by stage. Nothing is fabricated — the
 * backend omits any view/time-series metric, so the dashboard shows none.
 */
export function EmployerDashboardView() {
  const t = useTranslations("employer.dashboardLive");
  const tStatus = useTranslations("employer.applicants");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: EMPLOYER_DASHBOARD_KEY,
    queryFn: () => getEmployerDashboard(locale),
  });

  if (query.isLoading) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
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

  const data = query.data;
  const { attention, active_jobs: activeJobs, pipeline, totals } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* A. Attention queue — real counts with deep links */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("attention.title")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <AttentionCard
            value={attention.new_applicants}
            label={t("attention.newApplicants")}
            href="/employer/jobs"
            linkLabel={t("attention.reviewLink")}
          />
          <AttentionCard
            value={attention.jobs_near_deadline}
            label={t("attention.jobsNearDeadline")}
            href="/employer/jobs"
            linkLabel={t("attention.manageLink")}
          />
          <AttentionCard
            value={attention.draft_jobs}
            label={t("attention.draftJobs")}
            href="/employer/jobs"
            linkLabel={t("attention.publishLink")}
          />
        </div>
      </section>

      {/* B. Active jobs summary */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("activeJobs.title")}
        </h2>
        {activeJobs.length === 0 ? (
          <Card>
            <EmptyState
              compact
              title={t("activeJobs.emptyTitle")}
              description={t("activeJobs.emptyBody")}
              action={
                <LinkButton href="/employer/jobs/new" variant="secondary" size="sm">
                  {t("activeJobs.postJob")}
                </LinkButton>
              }
            />
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{t("activeJobs.caption")}</caption>
                <thead>
                  <tr className="border-b border-border-default bg-surface-raised">
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.role")}
                    </th>
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.status")}
                    </th>
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.deadline")}
                    </th>
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.applications")}
                    </th>
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.newApplicants")}
                    </th>
                    <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                      {t("activeJobs.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border-default last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/employer/jobs/${job.id}`}
                          className="type-body-sm font-medium text-text-primary no-underline hover:underline"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {t(`jobStatus.${job.status}`)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(job.application_deadline, locale) ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">
                        {job.application_count}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">
                        {job.new_applicant_count}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/employer/jobs/${job.id}/applicants`}
                          className="type-body-sm font-semibold text-brand-primary no-underline hover:underline"
                        >
                          {t("activeJobs.reviewApplicants")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* C. Candidate pipeline by stage — real counts */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("pipeline.title")}
        </h2>
        {totals.applications === 0 ? (
          <Card>
            <EmptyState
              compact
              title={t("pipeline.emptyTitle")}
              description={t("pipeline.emptyBody")}
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {ALL_STATUSES.map((status) => (
                <Card key={status} className="flex flex-col gap-1">
                  <span className="type-data tabular-nums text-text-primary">
                    {pipeline[status] ?? 0}
                  </span>
                  <span className="type-caption">
                    {tStatus(statusLabelKey(status))}
                  </span>
                </Card>
              ))}
            </div>
            <p className="type-caption">
              {t("pipeline.totals", {
                jobs: totals.jobs,
                applications: totals.applications,
              })}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function AttentionCard({
  value,
  label,
  href,
  linkLabel,
}: {
  value: number;
  label: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="type-data tabular-nums text-text-primary">{value}</span>
      <span className="type-body-sm text-text-secondary">{label}</span>
      <Link
        href={href}
        className="type-caption font-semibold text-brand-primary no-underline hover:underline"
      >
        {linkLabel}
      </Link>
    </Card>
  );
}
