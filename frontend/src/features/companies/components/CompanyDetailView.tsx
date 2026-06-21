"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  Skeleton,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { JobCard } from "@/features/jobs/components/JobCard";

import { getCompany } from "../service";

/**
 * Approved-company detail (spec §14.4): logo, name, approved status, summary,
 * optional culture/benefits, contact (website only, where present), and the
 * active public jobs list. No public reviews. Loading / error / not-found
 * states handled.
 */
export function CompanyDetailView({ slug }: { slug: string }) {
  const t = useTranslations("companies.detail");
  const tCommon = useTranslations("common.states");
  const tBadge = useTranslations("common.badge");
  const locale = useLocale();

  const query = useQuery({
    queryKey: ["company", slug, locale],
    queryFn: () => getCompany(slug, locale),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-16" />
        <Skeleton className="h-6 w-48" />
        <LoadingState
          title={t("loadingTitle")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </div>
    );
  }

  if (query.isError) {
    const status = (query.error as { status?: number })?.status;
    if (status === 404) {
      return (
        <ErrorState
          title={t("notFoundTitle")}
          description={t("notFoundBody")}
          action={
            <LinkButton href="/companies" variant="secondary">
              {t("backToDirectory")}
            </LinkButton>
          }
        />
      );
    }
    return (
      <ErrorState
        title={t("errorTitle")}
        description={t("errorBody")}
        action={
          <button
            type="button"
            onClick={() => query.refetch()}
            className="type-body-sm font-semibold text-brand-primary hover:underline"
          >
            {t("retry")}
          </button>
        }
      />
    );
  }

  const company = query.data;
  if (!company) return null;

  return (
    <>
      <Link
        href="/companies"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("backToDirectory")}
      </Link>

      <header className="mt-6 flex items-center gap-4">
        {company.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo}
            alt=""
            className="h-16 w-16 rounded-md border border-border-default object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-md bg-surface-subtle type-heading-2 text-text-secondary"
          >
            {company.company_name.charAt(0)}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="type-heading-1 text-text-primary">
            {company.company_name}
          </h1>
          {company.is_approved ? (
            <Badge tone="approved" withDot>
              {tBadge("approvedEmployer")}
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="type-heading-2 text-text-primary">{t("about")}</h2>
            {company.company_summary ? (
              <p className="type-body whitespace-pre-line text-text-secondary">
                {company.company_summary}
              </p>
            ) : (
              <p className="type-body-sm text-text-muted">{t("noSummary")}</p>
            )}

            {/* Optional facts — omitted entirely when absent. */}
            <dl className="grid gap-2 sm:grid-cols-2">
              {company.industry ? (
                <div className="flex flex-col">
                  <dt className="type-caption">{t("industry")}</dt>
                  <dd className="type-body-sm text-text-secondary">
                    {company.industry}
                  </dd>
                </div>
              ) : null}
              {company.company_location ? (
                <div className="flex flex-col">
                  <dt className="type-caption">{t("location")}</dt>
                  <dd className="type-body-sm text-text-secondary">
                    {company.company_location}
                  </dd>
                </div>
              ) : null}
              {company.company_size ? (
                <div className="flex flex-col">
                  <dt className="type-caption">{t("companySize")}</dt>
                  <dd className="type-body-sm text-text-secondary">
                    {company.company_size}
                  </dd>
                </div>
              ) : null}
              {company.website ? (
                <div className="flex flex-col">
                  <dt className="type-caption">{t("website")}</dt>
                  <dd className="type-body-sm">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-brand-primary no-underline hover:underline"
                    >
                      {company.website}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {company.culture_text || company.benefits_text ? (
            <Card className="flex flex-col gap-3">
              <h2 className="type-heading-3 text-text-primary">
                {t("culture")}
              </h2>
              {company.culture_text ? (
                <p className="type-body-sm whitespace-pre-line text-text-secondary">
                  {company.culture_text}
                </p>
              ) : null}
              {company.benefits_text ? (
                <div className="flex flex-col gap-1">
                  <h3 className="type-label text-text-primary">
                    {t("benefits")}
                  </h3>
                  <p className="type-body-sm whitespace-pre-line text-text-secondary">
                    {company.benefits_text}
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        <Card className="flex flex-col gap-3">
          <h2 className="type-heading-3 text-text-primary">{t("activeJobs")}</h2>
          {company.active_jobs.length === 0 ? (
            <EmptyState compact title={t("noActiveJobs")} />
          ) : (
            <ul className="flex flex-col gap-4">
              {company.active_jobs.map((job) => (
                <li key={job.slug}>
                  <JobCard
                    job={job}
                    as="link"
                    renderLink={(s, children) => (
                      <Link
                        href={`/jobs/${s}`}
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
        </Card>
      </div>
    </>
  );
}
