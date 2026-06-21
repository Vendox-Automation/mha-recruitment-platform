"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  IntelligenceCard,
  KeywordBars,
  SourceLabel,
} from "@/components/intelligence";
import { Card, LinkButton, Skeleton } from "@/components/ui";
import { publicInsightsKey } from "@/features/analytics/queryKeys";
import { getPublicInsights } from "@/features/analytics/publicInsightsService";
import type {
  MhaInsightItem,
  PublicInsights,
} from "@/features/analytics/publicInsightsTypes";

import { usePerspective } from "../PerspectiveContext";

/**
 * Career Intelligence Console (spec §5.3, §13.5, §14.1 D). The signature
 * information layer. Every module carries a {@link SourceLabel} so the reader
 * always knows whether a value is real platform analytics, an MHA insight, or a
 * clearly-labelled illustrative preview — and a metric without a reliable value
 * is shown as an honest preview, NEVER a fabricated number (AGENTS §13).
 *
 * This is NOT a ticker: there is no constant motion or flashing. Data is loaded
 * once and rendered statically.
 *
 * DATA-SOURCE CONTRACT (per module):
 *  - Roles in focus → REAL `popular_role_keywords` (Platform analytics) with a
 *    KeywordBars graphic + textual summary; "Illustrative preview" copy when the
 *    list is empty (before enough real data clears the small-group threshold).
 *  - Hiring outlook → curated `mha_insights[0]` (MHA insight) when present;
 *    otherwise the platform's real `recent_job_count` framed as Platform
 *    analytics (or an Illustrative preview when zero).
 *  - Salary guidance → an MHA insight card categorised "salary" when an admin
 *    has curated one; otherwise an Illustrative preview. Never a made-up range.
 *  - Skills / themes → REAL `popular_locations` (Platform analytics) as where
 *    roles are concentrated; Illustrative preview when empty.
 *  - MHA insight spotlight → curated `mha_insights` cards (MHA insight).
 *  - Action prompt → perspective-aware next step (no metric, no source needed).
 */

/** Pick the first curated insight whose category matches one of `categories`. */
function findInsight(
  insights: MhaInsightItem[] | undefined,
  categories: string[],
): MhaInsightItem | undefined {
  if (!insights) return undefined;
  const wanted = categories.map((c) => c.toLowerCase());
  return insights.find((item) =>
    wanted.includes((item.category ?? "").toLowerCase()),
  );
}

function ConsoleSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      ))}
    </div>
  );
}

export function CareerIntelligenceConsole() {
  const t = useTranslations("home.console");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const { perspective } = usePerspective();

  const { data, isPending, isError } = useQuery<PublicInsights>({
    queryKey: publicInsightsKey(locale),
    queryFn: () => getPublicInsights(locale),
  });

  if (isPending) {
    return <ConsoleSkeleton label={tCommon("loadingSpinner")} />;
  }

  // On error we still render an honest, useful console using illustrative
  // previews + MHA editorial copy — never a fabricated metric (spec §13.8
  // "static fallback for failed visual modules").
  const insights = isError ? undefined : data;
  const roleKeywords = insights?.popular_role_keywords ?? [];
  const locations = insights?.popular_locations ?? [];
  const recentJobs = insights?.recent_job_count ?? 0;
  const mhaInsights = insights?.mha_insights ?? [];

  const hiringInsight = findInsight(mhaInsights, ["hiring", "outlook", "market"]);
  const salaryInsight = findInsight(mhaInsights, ["salary", "compensation"]);
  // Spotlight = any remaining curated insight not already used above.
  const spotlight = mhaInsights.find(
    (item) => item !== hiringInsight && item !== salaryInsight,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Roles in focus — REAL popular role keywords (platform analytics). */}
      <Card className="flex flex-col gap-3 md:col-span-2 lg:col-span-1 lg:row-span-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="type-heading-3 text-text-primary">
            {t("rolesInFocus.title")}
          </h3>
          <SourceLabel
            source={roleKeywords.length ? "platformAnalytics" : "illustrativePreview"}
          />
        </div>
        {roleKeywords.length ? (
          <>
            <div className="h-40">
              <KeywordBars
                data={roleKeywords.slice(0, 6).map((k) => ({
                  label: k.keyword,
                  count: k.count,
                }))}
              />
            </div>
            {/* Textual summary so the chart is never visual-only (spec §13.7). */}
            <ul className="flex flex-col gap-1.5">
              {roleKeywords.slice(0, 6).map((k) => (
                <li
                  key={k.keyword}
                  className="flex items-center justify-between gap-3 type-body-sm text-text-secondary"
                >
                  <span className="capitalize">{k.keyword}</span>
                  <span className="type-label text-text-primary">
                    {t("rolesInFocus.count", { count: k.count })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="type-body-sm text-text-secondary">
              {t("rolesInFocus.body")}
            </p>
            <p className="type-caption">{t("previewNote")}</p>
          </>
        )}
      </Card>

      {/* Hiring outlook — curated MHA insight, else real recent activity. */}
      {hiringInsight ? (
        <IntelligenceCard
          title={t("hiringOutlook.title")}
          body={hiringInsight.body}
          source="mhaInsight"
        />
      ) : (
        <IntelligenceCard
          title={t("hiringOutlook.title")}
          body={
            recentJobs > 0
              ? t("hiringOutlook.recent", { count: recentJobs })
              : t("hiringOutlook.body")
          }
          source={recentJobs > 0 ? "platformAnalytics" : "illustrativePreview"}
          note={recentJobs > 0 ? undefined : t("previewNote")}
        />
      )}

      {/* Salary guidance — MHA insight only when curated; never fabricated. */}
      {salaryInsight ? (
        <IntelligenceCard
          title={t("salaryGuidance.title")}
          body={salaryInsight.body}
          source="mhaInsight"
        />
      ) : (
        <IntelligenceCard
          title={t("salaryGuidance.title")}
          body={t("salaryGuidance.body")}
          source="illustrativePreview"
          note={t("salaryGuidance.previewNote")}
        />
      )}

      {/* Skills / themes — REAL location concentration (platform analytics). */}
      {locations.length ? (
        <IntelligenceCard
          title={t("skillsThemes.locationsTitle")}
          source="platformAnalytics"
        >
          <ul className="flex flex-wrap gap-2">
            {locations.slice(0, 6).map((loc) => (
              <li
                key={loc.location}
                className="rounded-md border border-border-default bg-surface-subtle px-2.5 py-1 type-body-sm text-text-secondary"
              >
                {loc.location}
                <span className="ml-1.5 type-caption">{loc.count}</span>
              </li>
            ))}
          </ul>
        </IntelligenceCard>
      ) : (
        <IntelligenceCard
          title={t("skillsThemes.title")}
          body={t("skillsThemes.body")}
          source="illustrativePreview"
          note={t("previewNote")}
        />
      )}

      {/* MHA insight spotlight — curated editorial card. */}
      {spotlight ? (
        <IntelligenceCard
          title={spotlight.title}
          body={spotlight.body}
          source="mhaInsight"
        />
      ) : (
        <IntelligenceCard
          title={t("spotlight.title")}
          body={t("spotlight.body")}
          source="mhaInsight"
        />
      )}

      {/* Action prompt — perspective-aware next step (no metric). */}
      <Card tone="subtle" className="flex flex-col gap-3">
        <h3 className="type-heading-3 text-text-primary">
          {t(`actionPrompt.${perspective}.title`)}
        </h3>
        <p className="type-body-sm text-text-secondary">
          {t(`actionPrompt.${perspective}.body`)}
        </p>
        <div className="mt-auto pt-1">
          <LinkButton
            href={perspective === "candidate" ? "/jobs" : "/for-employers"}
            variant="secondary"
            size="sm"
          >
            {t(`actionPrompt.${perspective}.cta`)}
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
