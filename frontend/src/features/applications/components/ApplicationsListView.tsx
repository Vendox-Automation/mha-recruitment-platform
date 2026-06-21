"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

import { formatDate } from "../format";
import { APPLICATIONS_LIST_KEY } from "../queryKeys";
import { getMyApplications } from "../service";
import type { ApplicationListItem } from "../types";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";

/**
 * Candidate applications list (spec §14.9 C). Shows each application's role,
 * company, status, submitted date, and last update, newest first. Owns the
 * loading (skeletons), empty (honest "you haven't applied yet"), and
 * error/retry states. Each row links to the application detail.
 */
export function ApplicationsListView() {
  const t = useTranslations("candidate.applications");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: APPLICATIONS_LIST_KEY,
    queryFn: () => getMyApplications(locale),
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
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

  const applications = [...query.data.results].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  );

  if (applications.length === 0) {
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
      {applications.map((application) => (
        <li key={String(application.id)}>
          <ApplicationRow application={application} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

function ApplicationRow({
  application,
  locale,
}: {
  application: ApplicationListItem;
  locale: string;
}) {
  const t = useTranslations("candidate.applications");
  const submitted = formatDate(application.submitted_at, locale);
  const updated = formatDate(application.updated_at, locale);

  return (
    <Card interactive className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/candidate/applications/${application.id}`}
            className="type-heading-3 text-text-primary no-underline hover:underline"
          >
            {application.job.title}
          </Link>
          {application.job.company_name ? (
            <p className="type-body-sm text-text-secondary">
              {application.job.company_name}
              {application.job.location
                ? ` · ${application.job.location}`
                : null}
            </p>
          ) : null}
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex gap-1.5">
          <dt className="type-caption">{t("columns.applied")}</dt>
          <dd className="type-caption text-text-primary">{submitted ?? "—"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="type-caption">{t("columns.updated")}</dt>
          <dd className="type-caption text-text-primary">{updated ?? "—"}</dd>
        </div>
      </dl>
    </Card>
  );
}
