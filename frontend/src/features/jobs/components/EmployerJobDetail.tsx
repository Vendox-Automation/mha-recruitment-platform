"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { ApiRequestError } from "@/lib/api/client";

import { formatDate, formatSalary } from "../format";
import {
  closeJob,
  getMyJob,
  publishJob,
  reopenJob,
} from "../employerService";
import {
  availableJobActions,
  jobStatusKey,
  jobStatusTone,
} from "../employerStatus";
const EMPLOYMENT_TYPE_KEYS: Record<string, string> = {
  FULL_TIME: "fullTime",
  PART_TIME: "partTime",
  CONTRACT: "contract",
  INTERNSHIP: "internship",
  TEMPORARY: "temporary",
};

/**
 * Owner job preview/detail (spec §14.11). Shows every field, status, and the
 * screening questions, plus the lifecycle action buttons appropriate to the
 * status (Publish for DRAFT/CLOSED, Close for PUBLISHED, Reopen for CLOSED) and
 * an Edit link. A lifecycle action refetches/updates the cached job so the
 * status reflects the server; a refused transition — notably publishing past a
 * deadline — surfaces the server's message cleanly without losing the page.
 *
 * Handles not-found / permission (404/403) and generic error states.
 */
export function EmployerJobDetail({ id }: { id: string }) {
  const t = useTranslations("employer.jobDetailView");
  const tStatus = useTranslations("employer.jobs.status");
  const tType = useTranslations("jobs.employmentType");
  const tPeriod = useTranslations("jobs.salaryPeriod");
  const tScreen = useTranslations("employer.screening");
  const tQType = useTranslations("employer.screening.types");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: job, isPending, isError, error, refetch } = useQuery({
    queryKey: ["employer", "job", id],
    queryFn: () => getMyJob(id, locale),
  });

  const lifecycle = useMutation({
    mutationFn: (action: "publish" | "close" | "reopen") => {
      const run =
        action === "publish"
          ? publishJob
          : action === "close"
            ? closeJob
            : reopenJob;
      return run(id, locale);
    },
    onMutate: () => setActionError(null),
    onSuccess: (updated) => {
      queryClient.setQueryData(["employer", "job", id], updated);
      queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : t("actionError")),
  });

  if (isPending) {
    return <LoadingState title={t("loading")} spinnerLabel={t("loading")} />;
  }

  if (isError) {
    const notFound =
      error instanceof ApiRequestError &&
      (error.status === 404 || error.status === 403);
    return (
      <Card>
        <ErrorState
          title={notFound ? t("notFoundTitle") : t("errorTitle")}
          description={notFound ? t("notFoundBody") : t("errorBody")}
          action={
            notFound ? (
              <LinkButton href="/employer/jobs" size="sm">
                {t("backToJobs")}
              </LinkButton>
            ) : (
              <Button size="sm" onClick={() => refetch()}>
                {t("retry")}
              </Button>
            )
          }
        />
      </Card>
    );
  }

  const actions = availableJobActions(job.status);
  const salary = formatSalary(
    {
      salary_disclosed: job.salary_disclosed,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
      salary_period: job.salary_period,
    },
    locale,
    {
      hourly: tPeriod("hour"),
      daily: tPeriod("day"),
      monthly: tPeriod("month"),
      yearly: tPeriod("year"),
    },
  );
  const typeKey = EMPLOYMENT_TYPE_KEYS[job.employment_type];
  const deadline = formatDate(job.application_deadline, locale);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={jobStatusTone(job.status)} withDot>
                {tStatus(jobStatusKey(job.status))}
              </Badge>
              {job.is_mha_supported ? (
                <Badge tone="supported">{t("mhaSupported")}</Badge>
              ) : null}
            </div>
            <h2 className="type-heading-2 text-text-primary">{job.title}</h2>
            <p className="type-body-sm text-text-secondary">
              {typeKey ? tType(typeKey) : job.employment_type}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.includes("edit") ? (
              <LinkButton
                href={`/employer/jobs/${id}/edit`}
                variant="secondary"
                size="sm"
              >
                {t("edit")}
              </LinkButton>
            ) : null}
            {actions.includes("publish") ? (
              <Button
                size="sm"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("publish")}
              >
                {t("publish")}
              </Button>
            ) : null}
            {actions.includes("reopen") ? (
              <Button
                size="sm"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("reopen")}
              >
                {t("reopen")}
              </Button>
            ) : null}
            {actions.includes("close") ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate("close")}
              >
                {t("close")}
              </Button>
            ) : null}
          </div>
        </div>

        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        {job.status === "SUSPENDED" ? (
          <Alert tone="warning">
            {t("suspendedNotice")}
            {job.moderation_reason ? ` ${job.moderation_reason}` : ""}
          </Alert>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label={t("fields.salary")}>
            {salary.disclosed ? salary.text : t("salaryNotDisclosed")}
          </Detail>
          <Detail label={t("fields.deadline")}>{deadline ?? "—"}</Detail>
          <Detail label={t("fields.listingLanguage")}>
            {job.listing_language}
          </Detail>
          <Detail label={t("fields.published")}>
            {formatDate(job.published_at, locale) ?? "—"}
          </Detail>
        </dl>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="type-heading-3 text-text-primary">
          {t("sections.description")}
        </h3>
        <p className="type-body whitespace-pre-line text-text-secondary">
          {job.description || t("noDescription")}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="type-heading-3 text-text-primary">
          {t("sections.requirements")}
        </h3>
        <p className="type-body whitespace-pre-line text-text-secondary">
          {job.requirements || t("noRequirements")}
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="type-heading-3 text-text-primary">
          {tScreen("title")}
        </h3>
        {job.screening_questions.length === 0 ? (
          <p className="type-body-sm text-text-secondary">
            {t("noScreening")}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {job.screening_questions
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((q, index) => (
                <li
                  key={String(q.id ?? index)}
                  className="flex flex-col gap-1 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-body-sm font-semibold text-text-primary">
                      {q.question}
                    </span>
                    {q.is_required ? (
                      <Badge tone="neutral">{tScreen("required")}</Badge>
                    ) : null}
                  </div>
                  <span className="type-caption">{tQType(q.question_type)}</span>
                  {q.question_type === "SINGLE_CHOICE" &&
                  q.options_json.length > 0 ? (
                    <ul className="type-caption list-disc pl-5">
                      {q.options_json.map((option, i) => (
                        <li key={i}>{option}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
          </ol>
        )}
      </Card>

      <Link
        href="/employer/jobs"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("backToJobs")}
      </Link>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-label text-text-secondary">{label}</dt>
      <dd className="type-body-sm text-text-primary">{children}</dd>
    </div>
  );
}
