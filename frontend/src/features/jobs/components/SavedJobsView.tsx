"use client";

import { useLocale, useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
  Tag,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

import { employmentTypeKey, formatDate, formatSalary } from "../format";
import { useSavedJob, useSavedJobsList } from "../useSavedJob";
import type { SavedJob } from "../savedJobsTypes";

/**
 * The signed-in candidate's saved-jobs list (spec §15.5). Composition stays in
 * the page; all list/data UI lives here.
 *
 * Honesty rule (spec §15.5): a job that is no longer publicly open is LABELLED
 * "No longer open" and kept in the list — never silently dropped — so the
 * candidate understands why a previously-saved role can't be applied to.
 *
 * States: loading (skeleton rows), error (retry), empty ("no saved jobs"), and
 * the populated list. Each row links to the role and offers an un-save action.
 */
export function SavedJobsView() {
  const t = useTranslations("candidate.savedJobs");
  const tStates = useTranslations("common.states");
  const query = useSavedJobsList();

  if (query.isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">{tStates("loadingSpinner")}</span>
        {[0, 1, 2].map((row) => (
          <Card key={row} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <ErrorState
          title={t("errorTitle")}
          description={t("errorBody")}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => query.refetch()}
            >
              {tStates("retry")}
            </Button>
          }
        />
      </Card>
    );
  }

  const saved = query.data ?? [];

  if (saved.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <LinkButton href="/jobs" variant="secondary" size="sm">
              {t("browseJobs")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {saved.map((row) => (
        <li key={row.id}>
          <SavedJobRow row={row} />
        </li>
      ))}
    </ul>
  );
}

/** A single saved-job row: job summary, availability label, and un-save. */
function SavedJobRow({ row }: { row: SavedJob }) {
  const t = useTranslations("candidate.savedJobs");
  const tType = useTranslations("jobs.employmentType");
  const tPeriod = useTranslations("jobs.salaryPeriod");
  const tCard = useTranslations("jobs.card");
  const locale = useLocale();

  const { isMutating, canUnsave, toggle } = useSavedJob({
    slug: row.job.slug,
    jobId: row.job.id,
  });

  const job = row.job;
  const periodLabels: Record<string, string> = {
    year: tPeriod("year"),
    month: tPeriod("month"),
    week: tPeriod("week"),
    day: tPeriod("day"),
    hour: tPeriod("hour"),
  };
  const salary = formatSalary(job, locale, periodLabels);
  const typeKey = employmentTypeKey(job.employment_type);
  const employmentLabel = typeKey ? tType(typeKey) : job.employment_type;
  const savedOn = formatDate(row.created_at, locale);

  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Availability is LABELLED, not hidden (spec §15.5). */}
            <Badge tone={row.is_available ? "approved" : "neutral"} withDot>
              {row.is_available ? t("available") : t("unavailable")}
            </Badge>
          </div>
          {row.is_available ? (
            <Link
              href={`/jobs/${job.slug}`}
              className="type-heading-3 text-text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {job.title}
            </Link>
          ) : (
            // A closed role is no longer a live destination — show it as text.
            <span className="type-heading-3 text-text-primary">
              {job.title}
            </span>
          )}
          {job.company ? (
            <p className="type-body-sm text-text-secondary">
              {tCard("atCompany", { company: job.company.company_name })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isMutating || !canUnsave}
            onClick={toggle}
            aria-label={t("removeLabel", { title: job.title })}
          >
            {t("remove")}
          </Button>
          {!canUnsave ? (
            <span className="type-caption text-text-muted">
              {t("removeUnavailable")}
            </span>
          ) : null}
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-text-secondary">
        <div className="flex gap-1">
          <dt className="sr-only">{employmentLabel}</dt>
          <dd>
            <Tag>{employmentLabel}</Tag>
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <dd>{job.location ?? tCard("locationUnspecified")}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dd>{salary.disclosed ? salary.text : tCard("salaryNotDisclosed")}</dd>
        </div>
        {savedOn ? (
          <div className="flex items-center gap-1">
            <dt>{t("savedOn")}</dt>
            <dd>
              <time dateTime={row.created_at}>{savedOn}</time>
            </dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
