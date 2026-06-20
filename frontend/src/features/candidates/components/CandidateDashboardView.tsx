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
import { Link } from "@/i18n/navigation";
import {
  ApplicationStatusBadge,
  formatDate,
  PIPELINE_STAGES,
} from "@/features/applications";

import { employmentTypeKeyOrNull } from "../format";
import { NEXT_ACTION_ROUTE, selectNextAction } from "../nextAction";
import { CANDIDATE_DASHBOARD_KEY } from "../queryKeys";
import { getDashboard } from "../service";
import { ProfileCompletionMeter } from "./ProfileCompletionMeter";
import { ResumeSummary } from "./ResumeSummary";

/**
 * Candidate dashboard (spec §14.9). A calm command centre: a welcome with a
 * single clear NEXT ACTION (derived from {@link selectNextAction}), a profile
 * completion meter, a resume & profile summary with edit/replace links, and a
 * real application snapshot — the positive pipeline by stage, REJECTED shown
 * neutrally (never an achievement), the total, and a recent list linking to
 * detail. Counts are read straight from the API; nothing is fabricated.
 */
export function CandidateDashboardView() {
  const t = useTranslations("candidate.dashboard");
  const tResume = useTranslations("candidate.resume");
  const tEmployment = useTranslations("jobs.employmentType");
  const tApplications = useTranslations("candidate.applications");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const dashboardQuery = useQuery({
    queryKey: CANDIDATE_DASHBOARD_KEY,
    queryFn: () => getDashboard(locale),
  });

  if (dashboardQuery.isLoading) {
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

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => dashboardQuery.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const data = dashboardQuery.data;
  const nextAction = selectNextAction(data);
  const employmentKey = employmentTypeKeyOrNull(
    data.preferences.preferred_employment_type,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* A. Welcome + a single clear next action */}
      <Card tone="subtle" className="flex flex-col gap-3">
        <span className="type-label text-text-secondary">
          {t("nextAction.eyebrow")}
        </span>
        <h2 className="type-heading-3 text-text-primary">
          {t(`nextAction.${nextAction}.title`)}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {t(`nextAction.${nextAction}.body`)}
        </p>
        <div className="mt-1">
          <LinkButton href={NEXT_ACTION_ROUTE[nextAction]} size="sm">
            {t(`nextAction.${nextAction}.cta`)}
          </LinkButton>
        </div>
      </Card>

      {/* B. Resume & profile readiness */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {t("profileSummary.title")}
            </h2>
            <LinkButton href="/candidate/profile" variant="ghost" size="sm">
              {t("profileSummary.edit")}
            </LinkButton>
          </div>
          <ProfileCompletionMeter completion={data.profile_completion} />
          <dl className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="type-caption">{t("profileSummary.jobTitle")}</dt>
              <dd className="type-body-sm text-text-primary">
                {data.preferences.preferred_job_title ||
                  t("profileSummary.notSet")}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="type-caption">{t("profileSummary.location")}</dt>
              <dd className="type-body-sm text-text-primary">
                {data.preferences.preferred_location ||
                  t("profileSummary.notSet")}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="type-caption">{t("profileSummary.type")}</dt>
              <dd className="type-body-sm text-text-primary">
                {employmentKey
                  ? tEmployment(employmentKey)
                  : data.preferences.preferred_employment_type ||
                    t("profileSummary.notSet")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {tResume("title")}
            </h2>
            <LinkButton href="/candidate/resume" variant="ghost" size="sm">
              {data.resume.has_resume
                ? tResume("manage")
                : tResume("upload")}
            </LinkButton>
          </div>
          <ResumeSummary
            hasResume={data.resume.has_resume}
            originalName={data.resume.original_name}
            uploadedAt={data.resume.uploaded_at}
            actions={
              !data.resume.has_resume ? (
                <LinkButton
                  href="/candidate/resume"
                  variant="secondary"
                  size="sm"
                >
                  {tResume("upload")}
                </LinkButton>
              ) : null
            }
          />
        </Card>
      </div>

      {/* C. Application snapshot — real counts (spec §14.9) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="type-heading-2 text-text-primary">
            {t("snapshot.title")}
          </h2>
          <LinkButton
            href="/candidate/applications"
            variant="ghost"
            size="sm"
          >
            {t("snapshot.viewAll")}
          </LinkButton>
        </div>

        {data.applications.total === 0 ? (
          <EmptyState
            compact
            title={t("snapshot.emptyTitle")}
            description={t("snapshot.emptyBody")}
            action={
              <LinkButton href="/jobs" variant="secondary" size="sm">
                {tApplications("browseJobs")}
              </LinkButton>
            }
          />
        ) : (
          <>
            {/* Positive pipeline: APPLIED → … → HIRED */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PIPELINE_STAGES.map((stage) => (
                <Card key={stage} className="flex flex-col gap-1">
                  <span className="type-data text-text-primary">
                    {data.applications.by_stage[stage] ?? 0}
                  </span>
                  <span className="type-caption">
                    {tApplications(`status.${stage}.label`)}
                  </span>
                </Card>
              ))}
            </div>

            {/* Rejected shown neutrally, outside the pipeline (never an achievement) */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <p className="type-caption">
                {t("snapshot.total")}:{" "}
                <span className="text-text-primary">
                  {data.applications.total}
                </span>
              </p>
              <p className="type-caption">
                {t("snapshot.active")}:{" "}
                <span className="text-text-primary">
                  {data.applications.active}
                </span>
              </p>
              <p className="type-caption">
                {tApplications("status.REJECTED.label")}:{" "}
                <span className="text-text-primary">
                  {data.applications.by_stage.REJECTED ?? 0}
                </span>
              </p>
            </div>

            {/* Recent applications */}
            {data.applications.recent.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {data.applications.recent.map((item) => (
                  <li key={String(item.id)}>
                    <Card
                      interactive
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/candidate/applications/${item.id}`}
                          className="type-body-sm font-medium text-text-primary no-underline hover:underline"
                        >
                          {item.job_title}
                        </Link>
                        <p className="type-caption">
                          {formatDate(item.submitted_at, locale) ?? ""}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={item.status} />
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
