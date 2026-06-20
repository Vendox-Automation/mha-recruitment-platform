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

import { employmentTypeKeyOrNull } from "../format";
import { NEXT_ACTION_ROUTE, selectNextAction } from "../nextAction";
import { CANDIDATE_DASHBOARD_KEY } from "../queryKeys";
import { getDashboard } from "../service";
import { ProfileCompletionMeter } from "./ProfileCompletionMeter";
import { ResumeSummary } from "./ResumeSummary";

const SNAPSHOT_KEYS = [
  "submitted",
  "in_review",
  "shortlisted",
  "rejected",
] as const;

/**
 * Candidate dashboard (spec §14.9). A calm command centre: a welcome with a
 * single clear NEXT ACTION (derived from {@link selectNextAction}), a profile
 * completion meter, a resume & profile summary with edit/replace links, and an
 * honest application snapshot (zeros + empty — applications are Phase 6, never
 * fabricated).
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

      {/* C. Application snapshot — honest zeros (applications are Phase 6) */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("snapshot.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SNAPSHOT_KEYS.map((key) => (
            <Card key={key} className="flex flex-col gap-1">
              <span className="type-data text-text-primary">
                {data.applications[key]}
              </span>
              <span className="type-caption">{t(`snapshot.${key}`)}</span>
            </Card>
          ))}
        </div>
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
      </section>
    </div>
  );
}
