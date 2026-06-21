"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";

import {
  formatConversionRate,
  humaniseDuration,
  toStageBars,
} from "../format";
import { employerAnalyticsKey } from "../queryKeys";
import { getEmployerAnalytics } from "../service";
import type { EmployerAnalytics } from "../types";

/**
 * Employer analytics (spec §15.8). Composition stays in the page; all data UI
 * lives here. Every figure is the real, employer-scoped API value.
 *
 * INTEGRITY (spec §13): metrics the backend returns as `null` (conversion rate
 * before the reliability floor; time-to-first when not derivable) render an
 * explicit "not enough data yet" — NEVER a fabricated 0% / 100%.
 *
 * ACCESSIBILITY (spec §23): the stage distribution is drawn as semantic bars AND
 * paired with a visually-hidden data table, so the same numbers are available to
 * screen-reader and keyboard users without relying on the visual.
 */
export function EmployerAnalyticsView() {
  const t = useTranslations("employer.analytics");
  const tStates = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery<EmployerAnalytics>({
    queryKey: employerAnalyticsKey(locale),
    queryFn: () => getEmployerAnalytics(locale),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div
        className="flex flex-col gap-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">{tStates("loadingSpinner")}</span>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((cell) => (
            <Card key={cell} className="flex flex-col gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
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

  const data = query.data;
  if (!data) return null;

  // No jobs yet → there is genuinely nothing to measure. Honest empty state.
  if (data.jobs.total === 0) {
    return (
      <Card>
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      </Card>
    );
  }

  const conversion = formatConversionRate(
    data.application_conversion_rate,
    locale,
  );
  const ttfa = humaniseDuration(data.time_to_first_application_seconds);
  const notEnough = t("notEnough");

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={t("metrics.views")} value={formatCount(data.views.total, locale)} />
        <Metric
          label={t("metrics.applications")}
          value={formatCount(data.applications.total, locale)}
        />
        <Metric
          label={t("metrics.conversion")}
          value={conversion}
          fallback={notEnough}
          hint={t("conversionHint")}
        />
        <Metric
          label={t("metrics.timeToFirst")}
          value={
            ttfa
              ? t("duration.approx", {
                  value: ttfa.value,
                  unit: t(`duration.${ttfa.unit}`, { value: ttfa.value }),
                })
              : null
          }
          fallback={notEnough}
        />
      </dl>

      <StageDistribution data={data} />

      <p className="type-caption text-text-muted">
        {t("generatedAt", { date: formatGeneratedAt(data.generated_at, locale) })}
      </p>
    </div>
  );
}

/** A single metric cell. A null `value` falls back to the honest "not enough data". */
function Metric({
  label,
  value,
  fallback,
  hint,
}: {
  label: string;
  value: string | null;
  fallback?: string;
  hint?: string;
}) {
  const reliable = value !== null;
  return (
    <Card className="flex flex-col gap-1">
      <dd
        className={
          reliable
            ? "type-heading-1 text-text-primary"
            : "type-body-sm text-text-muted"
        }
      >
        {reliable ? value : (fallback ?? "—")}
      </dd>
      <dt className="type-caption text-text-secondary">{label}</dt>
      {hint && reliable ? (
        <p className="type-caption text-text-muted">{hint}</p>
      ) : null}
    </Card>
  );
}

/**
 * Stage distribution as accessible bars + a visually-hidden data table. The bars
 * are decorative (`aria-hidden`); the table is the source of truth for assistive
 * tech, so the same counts reach everyone (spec §23 text alternative).
 */
function StageDistribution({ data }: { data: EmployerAnalytics }) {
  const t = useTranslations("employer.analytics");
  const tStatus = useTranslations("employer.applicants.status");
  const { bars, total } = toStageBars(data.stage_distribution);

  return (
    <Card as="section" aria-labelledby="stage-dist-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="stage-dist-heading" className="type-heading-3 text-text-primary">
          {t("stageTitle")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("stageLead")}</p>
      </div>

      {total === 0 ? (
        <p className="type-body-sm text-text-muted">{t("stageEmpty")}</p>
      ) : (
        <>
          {/* Visual bars — decorative; the table below carries the data. */}
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {bars.map((bar) => (
              <li key={bar.status} className="flex items-center gap-3">
                <span className="w-28 shrink-0 type-caption text-text-secondary">
                  {tStatus(`${bar.status}.label`)}
                </span>
                <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-primary"
                    style={{ width: `${bar.percent}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right type-caption tabular-nums text-text-primary">
                  {bar.count}
                </span>
              </li>
            ))}
          </ul>

          {/* Text/data alternative (spec §23) — the authoritative numbers. */}
          <table className="sr-only">
            <caption>{t("stageTableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("stageColumnStage")}</th>
                <th scope="col">{t("stageColumnCount")}</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.status}>
                  <th scope="row">{tStatus(`${bar.status}.label`)}</th>
                  <td>{bar.count}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t("stageTotal")}</th>
                <td>{total}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}

/** Locale-aware integer count. */
function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Locale-aware date for the "generated" line (raw value if unparseable). */
function formatGeneratedAt(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
