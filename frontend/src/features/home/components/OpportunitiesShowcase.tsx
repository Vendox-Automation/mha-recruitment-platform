"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { CompanyCard } from "@/features/companies/components/CompanyCard";
import type { PublicCompanyListItem } from "@/features/companies/types";
import { JobCard } from "@/features/jobs/components/JobCard";
import type { PublicJobListItem } from "@/features/jobs/types";
import {
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

import {
  featuredCompaniesKey,
  latestJobsKey,
} from "../queryKeys";
import { getFeaturedCompanies, getLatestJobs } from "../service";

/**
 * Opportunities and organisations (spec §14.1 E). Shows the LATEST real
 * published roles and a few approved organisations — both fetched from the
 * public endpoints. No counts are hard-coded; before real data exists each
 * column renders an honest empty state with a route into the full listing
 * (spec §14.1 E, AGENTS §13). Loading, empty, and error states are all handled.
 */

function CardSkeletons({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-canvas p-5"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function JobsColumn() {
  const t = useTranslations("home.opportunities");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const { data, isPending, isError } = useQuery<PublicJobListItem[]>({
    queryKey: latestJobsKey(locale),
    queryFn: () => getLatestJobs(locale),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-heading-3 text-text-primary">{t("jobsTitle")}</h3>
        <Link
          href="/jobs"
          className="type-body-sm font-semibold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {t("jobsCta")}
        </Link>
      </div>
      {isPending ? (
        <CardSkeletons label={tCommon("loadingSpinner")} />
      ) : isError ? (
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          compact
        />
      ) : data.length === 0 ? (
        <EmptyState
          title={t("jobsTitle")}
          description={t("jobsEmpty")}
          compact
          action={
            <LinkButton href="/jobs" variant="secondary" size="sm">
              {t("jobsCta")}
            </LinkButton>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((job) => (
            <li key={job.slug}>
              <JobCard
                job={job}
                as="link"
                renderLink={(slug, children) => (
                  <Link
                    href={`/jobs/${slug}`}
                    className="no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    {children}
                  </Link>
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompaniesColumn() {
  const t = useTranslations("home.opportunities");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const { data, isPending, isError } = useQuery<PublicCompanyListItem[]>({
    queryKey: featuredCompaniesKey(locale),
    queryFn: () => getFeaturedCompanies(locale),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-heading-3 text-text-primary">
          {t("companiesTitle")}
        </h3>
        <Link
          href="/companies"
          className="type-body-sm font-semibold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {t("companiesCta")}
        </Link>
      </div>
      {isPending ? (
        <CardSkeletons label={tCommon("loadingSpinner")} />
      ) : isError ? (
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          compact
        />
      ) : data.length === 0 ? (
        <EmptyState
          title={t("companiesTitle")}
          description={t("companiesEmpty")}
          compact
          action={
            <LinkButton href="/companies" variant="secondary" size="sm">
              {t("companiesCta")}
            </LinkButton>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((company) => (
            <li key={company.slug}>
              <CompanyCard company={company} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OpportunitiesShowcase() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <JobsColumn />
      <CompaniesColumn />
    </div>
  );
}
