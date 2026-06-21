import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { EmployerAnalyticsView } from "@/features/analytics/components/EmployerAnalyticsView";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer analytics (spec §14.10 E, §15.8). Composition only: the page provides
 * the header, then renders the client {@link EmployerAnalyticsView}, which loads
 * the real, employer-scoped figures and renders honest "not enough data yet" for
 * any metric the backend withholds as unreliable. Wrapped in
 * {@link EmployerWorkspaceGuard}: only an APPROVED employer reaches this.
 */
export default async function EmployerAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer width="wide" className="flex flex-col gap-8">
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("analytics.title")}
          description={t("analytics.description")}
        />
        <EmployerAnalyticsView />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
