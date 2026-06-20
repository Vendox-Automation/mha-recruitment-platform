import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { CandidateDashboardView } from "@/features/candidates";

/**
 * Candidate dashboard — "career command centre" (spec §14.9). Composition only:
 * the candidate layout's RouteGuard gates to an authenticated CANDIDATE; the
 * feature view loads the dashboard snapshot and renders the next action,
 * completion meter, resume/profile summary, and honest application snapshot.
 */
export default async function CandidateDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

  return (
    <PageContainer width="wide" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />
      <CandidateDashboardView />
    </PageContainer>
  );
}
