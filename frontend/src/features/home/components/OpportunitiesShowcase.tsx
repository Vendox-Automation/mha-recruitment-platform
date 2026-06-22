"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { EmptyState, ErrorState, LinkButton, Skeleton } from "@/components/ui";
import { CompanyCard } from "@/features/companies/components/CompanyCard";
import type { PublicCompanyListItem } from "@/features/companies/types";

import { featuredCompaniesKey } from "../queryKeys";
import { getFeaturedCompanies } from "../service";

/**
 * Featured organisations (spec §14.1 E). A showcase of approved organisations —
 * each card carries the company logo, summary, real review rating, active-role
 * count, and a route into the full company profile. Data is fetched from the
 * public companies endpoint; no counts are hard-coded and an empty list renders
 * an honest empty state (AGENTS §13). Loading, empty, and error are all handled.
 */
function CardSkeletons({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-canvas p-5"
        >
          <Skeleton className="h-12 w-12 rounded-md" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function OpportunitiesShowcase() {
  const t = useTranslations("home.opportunities");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const { data, isPending, isError } = useQuery<PublicCompanyListItem[]>({
    queryKey: featuredCompaniesKey(locale),
    queryFn: () => getFeaturedCompanies(locale),
  });

  if (isPending) {
    return <CardSkeletons label={tCommon("loadingSpinner")} />;
  }
  if (isError) {
    return (
      <ErrorState
        title={tCommon("errorTitle")}
        description={tCommon("errorDescription")}
      />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title={t("companiesTitle")}
        description={t("companiesEmpty")}
        action={
          <LinkButton href="/companies" variant="secondary" size="sm">
            {t("companiesCta")}
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((company) => (
          <li key={company.slug}>
            <CompanyCard company={company} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center">
        <LinkButton href="/companies" variant="secondary" size="md">
          {t("companiesCta")}
        </LinkButton>
      </div>
    </div>
  );
}
