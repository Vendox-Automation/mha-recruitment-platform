"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  Skeleton,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

import { getJob } from "../service";
import { JobActions } from "./JobActions";
import { JobDetailHeader } from "./JobDetailHeader";
import { JobDetailSections } from "./JobDetailSections";

/**
 * Full job-detail page body (spec §14.3). Client component because it owns the
 * data fetch (keyed on slug + locale), the session-aware actions, and the
 * not-found / error / loading states. Desktop: sticky application panel on the
 * right. Mobile: sticky bottom action bar.
 */
export function JobDetailView({ slug }: { slug: string }) {
  const t = useTranslations("jobs.detail");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: ["job", slug, locale],
    queryFn: () => getJob(slug, locale),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // A 404 means the role isn't public — don't retry, show not-found.
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
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
            <LinkButton href="/jobs" variant="secondary">
              {t("browseRoles")}
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

  const job = query.data;
  if (!job) return null;

  return (
    <>
      <Link
        href="/jobs"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("backToSearch")}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <JobDetailHeader job={job} />
          <JobDetailSections job={job} />
        </div>

        {/* Sticky application panel (desktop) */}
        <aside className="hidden lg:block">
          <Card className="sticky top-24 flex flex-col gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {t("panel.title")}
            </h2>
            <p className="type-body-sm text-text-secondary">
              {t("panel.signInPrompt")}
            </p>
            <JobActions slug={job.slug} layout="stacked" />
          </Card>
        </aside>
      </div>

      {/* Sticky bottom action bar (mobile) */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-border-default bg-surface-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
        <JobActions slug={job.slug} layout="inline" />
      </div>
    </>
  );
}
