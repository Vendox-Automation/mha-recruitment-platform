"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  PermissionDeniedState,
  Skeleton,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

import { formatDate } from "../format";
import { applicationDetailKey } from "../queryKeys";
import { getApplication } from "../service";
import {
  statusMeaningKey,
  statusNextActionKey,
} from "../status";
import type { ApplicationAnswer, ApplicationDetail } from "../types";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { StatusTimeline } from "./StatusTimeline";

/**
 * Candidate application detail (spec §14.9 C, §15.4). Shows the job summary, the
 * current stage with a localised plain-language MEANING, the status timeline,
 * the submitted cover letter + answers, and a next-action hint. Owns its
 * loading, not-found, permission-denied, and error states.
 *
 * SECURITY: renders only candidate-safe fields — there are NO employer notes
 * here (the serializer omits them; spec §15.4).
 */
export function ApplicationDetailView({ id }: { id: string }) {
  const t = useTranslations("candidate.applications");
  const tDetail = useTranslations("candidate.applications.detail");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: applicationDetailKey(id),
    queryFn: () => getApplication(id, locale),
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404 || status === 403) return false;
      return failureCount < 2;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <LoadingState
          title={tCommon("loadingTitle")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </div>
    );
  }

  if (query.isError) {
    const status = (query.error as { status?: number })?.status;
    if (status === 403) {
      return (
        <Card>
          <PermissionDeniedState
            title={tCommon("permissionTitle")}
            description={tCommon("permissionDescription")}
            action={
              <LinkButton href="/candidate/applications" variant="secondary">
                {tDetail("backToApplications")}
              </LinkButton>
            }
          />
        </Card>
      );
    }
    if (status === 404) {
      return (
        <Card>
          <ErrorState
            title={tDetail("notFoundTitle")}
            description={tDetail("notFoundBody")}
            action={
              <LinkButton href="/candidate/applications" variant="secondary">
                {tDetail("backToApplications")}
              </LinkButton>
            }
          />
        </Card>
      );
    }
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

  const application = query.data;
  if (!application) return null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/candidate/applications"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {tDetail("backToApplications")}
      </Link>

      <JobSummary application={application} locale={locale} t={t} />

      {/* Current stage + plain-language meaning + next action */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-heading-3 text-text-primary">
            {tDetail("currentStage")}
          </h2>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <p className="type-body-sm text-text-secondary">
          {t(statusMeaningKey(application.status))}
        </p>
        <p className="type-body-sm text-text-primary">
          <span className="font-medium">{tDetail("nextLabel")}: </span>
          {t(statusNextActionKey(application.status))}
        </p>
      </Card>

      {/* Status timeline */}
      <Card className="flex flex-col gap-4">
        <h2 className="type-heading-3 text-text-primary">
          {tDetail("timelineTitle")}
        </h2>
        <StatusTimeline entries={application.status_history} />
      </Card>

      {/* Submission: cover letter + answers + resume snapshot */}
      <Card className="flex flex-col gap-5">
        <h2 className="type-heading-3 text-text-primary">
          {tDetail("submissionTitle")}
        </h2>

        <div className="flex flex-col gap-1">
          <h3 className="type-label text-text-primary">
            {tDetail("resumeLabel")}
          </h3>
          <p className="type-body-sm text-text-secondary">
            {application.has_resume_snapshot
              ? application.resume_snapshot_name || tDetail("resumeOnFile")
              : tDetail("noResumeSnapshot")}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="type-label text-text-primary">
            {tDetail("coverLetterLabel")}
          </h3>
          <p className="type-body-sm whitespace-pre-wrap text-text-secondary">
            {application.cover_letter?.trim() || tDetail("coverLetterEmpty")}
          </p>
        </div>

        {application.answers.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className="type-label text-text-primary">
              {tDetail("answersLabel")}
            </h3>
            <dl className="flex flex-col gap-3">
              {application.answers.map((answer, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <dt className="type-body-sm font-medium text-text-primary">
                    {answer.question.question}
                  </dt>
                  <dd className="type-body-sm text-text-secondary">
                    {renderAnswer(answer, tDetail)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function JobSummary({
  application,
  locale,
  t,
}: {
  application: ApplicationDetail;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const submitted = formatDate(application.submitted_at, locale);
  return (
    <Card tone="subtle" className="flex flex-col gap-2">
      <Link
        href={`/jobs/${application.job.slug}`}
        className="type-heading-2 text-text-primary no-underline hover:underline"
      >
        {application.job.title}
      </Link>
      <p className="type-body-sm text-text-secondary">
        {[application.job.company_name, application.job.location]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {submitted ? (
        <p className="type-caption">
          {t("columns.applied")}: {submitted}
        </p>
      ) : null}
    </Card>
  );
}

/** Present a stored answer; YES_NO and JSON values read as plain text. */
function renderAnswer(
  answer: ApplicationAnswer,
  tDetail: ReturnType<typeof useTranslations>,
): string {
  const type = answer.question.question_type;
  if (type === "YES_NO") {
    const value = answer.answer_json;
    if (value === true) return tDetail("yes");
    if (value === false) return tDetail("no");
  }
  if (answer.answer_text && answer.answer_text.trim() !== "") {
    return answer.answer_text;
  }
  if (answer.answer_json != null && typeof answer.answer_json !== "object") {
    return String(answer.answer_json);
  }
  return tDetail("notAnswered");
}
