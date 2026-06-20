import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState } from "@/components/ui";

const METRICS = [
  "views",
  "applications",
  "conversion",
  "timeToFirst",
  "stageDistribution",
] as const;

/** Employer analytics shell (spec §14.10 E, §15.8). Honest empty metrics. */
export default async function EmployerAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <PageContainer width="wide" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("analytics.title")}
        description={t("analytics.description")}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {METRICS.map((key) => (
          <Card key={key} className="flex flex-col gap-1">
            <span className="type-data text-text-muted" aria-hidden="true">
              —
            </span>
            <span className="type-caption">{t(`analytics.metrics.${key}`)}</span>
          </Card>
        ))}
      </div>
      <Card>
        <EmptyState
          title={t("analytics.emptyTitle")}
          description={t("analytics.emptyBody")}
        />
      </Card>
    </PageContainer>
  );
}
