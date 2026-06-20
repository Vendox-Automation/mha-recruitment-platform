"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";

import { bandLabelKey, bandTone, isSparseFit } from "../fit";
import { jobFitKey } from "../queryKeys";
import { getJobFit, regenerateJobFit } from "../service";
import type { JobFitResult } from "../types";

/**
 * Candidate-facing Smart Job Fit section for the job-detail page (spec §14.3,
 * §16). Composition stays in the page; all fit UI lives here.
 *
 * Viewer-role behaviour:
 *  - Anonymous → a "Sign in to see your Job Fit" prompt. NO fit is fetched.
 *  - Candidate → fetch + render score/band, matched/gaps/unknown lists, the
 *    explanation, an always-present disclaimer, and a Regenerate button.
 *  - Employer / admin → nothing rendered: fit is candidate-only (no employer
 *    ranking, spec §16.1).
 *
 * Honesty rules: the score is only ever the real API value (never fabricated),
 * the disclaimer is ALWAYS shown, and a sparse result (mostly unknowns) shows an
 * honest "not enough information yet" state rather than an overstated number.
 *
 * Accessibility: the band is conveyed by a text label + the numeric score, not
 * colour alone (spec §13.7); the three reason groups are real `<ul>` lists with
 * headings; the Regenerate button is a labelled native button.
 */
export function SmartJobFit({ slug }: { slug: string }) {
  const t = useTranslations("jobs.detail.fit");
  const tStates = useTranslations("common.states");
  const locale = useLocale();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const isCandidate = isAuthenticated && role === "CANDIDATE";

  const query = useQuery({
    queryKey: jobFitKey(slug, locale),
    queryFn: () => getJobFit(slug, locale),
    enabled: isCandidate,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      // 404 (job not public) / 403 (not a candidate) are terminal, not transient.
      if (status === 404 || status === 403) return false;
      return failureCount < 2;
    },
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateJobFit(slug, locale),
    onSuccess: (data: JobFitResult) => {
      queryClient.setQueryData(jobFitKey(slug, locale), data);
    },
  });

  const sectionTitle = t("title");

  // Anonymous → sign-in prompt, no fetch (spec §16: fit is per-candidate).
  if (!isAuthenticated && !authLoading) {
    return (
      <FitSection title={sectionTitle}>
        <p className="type-body-sm text-text-secondary">{t("signInBody")}</p>
        <div>
          <LinkButton href="/sign-in" variant="secondary" size="sm">
            {t("signInPrompt")}
          </LinkButton>
        </div>
        <Alert tone="info" title={t("disclaimerLabel")}>
          {t("disclaimer")}
        </Alert>
      </FitSection>
    );
  }

  // Employer / admin (or any non-candidate signed-in user) → not shown.
  if (isAuthenticated && !isCandidate) {
    return null;
  }

  // Resolving the session, or fetching the fit → skeletons.
  if (authLoading || query.isLoading) {
    return (
      <FitSection title={sectionTitle}>
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <span className="sr-only">{tStates("loadingSpinner")}</span>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </FitSection>
    );
  }

  if (query.isError) {
    return (
      <FitSection title={sectionTitle}>
        <ErrorState
          compact
          title={t("errorTitle")}
          description={t("errorBody")}
          action={
            <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      </FitSection>
    );
  }

  const fit = query.data;
  if (!fit) return null;

  const generatedAt = formatGeneratedAt(fit.generated_at, locale);

  const disclaimerBlock = (
    <Alert tone="info" title={t("disclaimerLabel")}>
      {/* Prefer the backend disclaimer string (spec §16.6); fall back to the
          localised equivalent if the API ever omits it. Always rendered. */}
      {fit.disclaimer?.trim() ? fit.disclaimer : t("disclaimer")}
    </Alert>
  );

  const regenerateButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => regenerate.mutate()}
      disabled={regenerate.isPending}
    >
      {regenerate.isPending ? t("regenerating") : t("regenerate")}
    </Button>
  );

  // Sparse result (mostly unknowns) → honest empty state, never a hollow score.
  if (isSparseFit(fit)) {
    return (
      <FitSection title={sectionTitle}>
        <EmptyState
          compact
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={regenerateButton}
        />
        {fit.unknown.length > 0 ? (
          <ReasonGroup
            title={t("groups.unknown")}
            items={fit.unknown}
            tone="muted"
          />
        ) : null}
        {disclaimerBlock}
      </FitSection>
    );
  }

  return (
    <FitSection title={sectionTitle}>
      {/* Score + band. The percentage and the text band label both carry the
          meaning; the Badge tone is a redundant cue only (spec §13.7). */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="type-heading-1 text-text-primary" aria-hidden="true">
          {fit.score}%
        </span>
        <Badge tone={bandTone(fit.band)} withDot>
          {t(`band.${bandLabelKey(fit.band)}`)}
        </Badge>
        <span className="sr-only">
          {t("scoreSr", {
            score: fit.score,
            band: t(`band.${bandLabelKey(fit.band)}`),
          })}
        </span>
      </div>

      {fit.explanation?.trim() ? (
        <p className="type-body-sm text-text-secondary">{fit.explanation}</p>
      ) : null}

      <dl className="flex flex-col gap-4">
        {fit.matched.length > 0 ? (
          <ReasonGroup
            title={t("groups.matched")}
            items={fit.matched}
            tone="positive"
          />
        ) : null}
        {fit.gaps.length > 0 ? (
          <ReasonGroup
            title={t("groups.gaps")}
            items={fit.gaps}
            tone="warning"
          />
        ) : null}
        {fit.unknown.length > 0 ? (
          <ReasonGroup
            title={t("groups.unknown")}
            items={fit.unknown}
            tone="muted"
          />
        ) : null}
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {regenerateButton}
        {generatedAt ? (
          <span className="type-caption text-text-muted">
            {t("generatedAt", { date: generatedAt })}
          </span>
        ) : null}
      </div>

      {regenerate.isError ? (
        <Alert tone="danger" title={t("regenerateErrorTitle")}>
          {t("regenerateErrorBody")}
        </Alert>
      ) : null}

      {disclaimerBlock}
    </FitSection>
  );
}

/**
 * Section shell shared by every Smart Job Fit state so the heading and bordered
 * frame stay identical across loading / error / empty / result. The heading
 * labels the region for assistive tech (`aria-labelledby`).
 */
function FitSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="job-fit-heading"
      className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-canvas p-5"
    >
      <h2 id="job-fit-heading" className="type-heading-3 text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Locale-aware date+time for the "generated" timestamp (null if unparseable). */
function formatGeneratedAt(value: string, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * A clearly-grouped, accessible list of backend reason strings. The group title
 * is localised chrome; the individual items are backend-generated candidate
 * strings rendered AS-IS (their zh-CN localization is Phase 11).
 */
function ReasonGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "warning" | "muted";
}) {
  const marker: Record<typeof tone, string> = {
    positive: "text-status-success",
    warning: "text-status-warning",
    muted: "text-text-muted",
  } as const;

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="type-label text-text-primary">{title}</dt>
      <dd>
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-2 type-body-sm text-text-secondary"
            >
              <span aria-hidden="true" className={marker[tone]}>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
