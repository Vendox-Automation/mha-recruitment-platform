"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Card, ErrorState, LoadingState } from "@/components/ui";
import { LinkButton } from "@/components/ui";

import { getJob } from "../service";
import { JobDetailHeader } from "./JobDetailHeader";
import { JobDetailSections } from "./JobDetailSections";

/**
 * Desktop split-screen preview (spec §14.2). Fetches the selected job's detail
 * (keyed by slug) and shows a condensed version of the detail page with a link
 * to open the full page. Empty / loading / error states are all handled.
 */
export function JobPreviewPane({ slug }: { slug: string | null }) {
  const t = useTranslations("jobs.search");
  const tDetail = useTranslations("jobs.detail");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: ["job", slug, locale],
    queryFn: () => getJob(slug as string, locale),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  if (!slug) {
    return (
      <Card className="sticky top-24 flex min-h-[24rem] items-center justify-center text-center">
        <p className="type-body-sm max-w-xs text-text-muted">
          {t("selectPrompt")}
        </p>
      </Card>
    );
  }

  if (query.isLoading) {
    return (
      <Card className="sticky top-24">
        <LoadingState
          compact
          title={tDetail("loadingTitle")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="sticky top-24">
        <ErrorState
          compact
          title={tDetail("errorTitle")}
          description={tDetail("errorBody")}
          action={
            <button
              type="button"
              onClick={() => query.refetch()}
              className="type-body-sm font-semibold text-brand-primary hover:underline"
            >
              {tDetail("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const job = query.data;

  return (
    <Card className="sticky top-24 flex max-h-[calc(100vh-8rem)] flex-col gap-5 overflow-y-auto">
      <JobDetailHeader job={job} compact />
      <LinkButton href={`/jobs/${job.slug}`} size="sm" variant="secondary">
        {t("openInPage")}
      </LinkButton>
      <JobDetailSections job={job} compact />
    </Card>
  );
}
