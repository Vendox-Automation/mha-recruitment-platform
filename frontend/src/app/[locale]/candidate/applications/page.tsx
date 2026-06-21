import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { ApplicationsListView } from "@/features/applications";

/**
 * Candidate applications list (spec §14.9 C). Composition only — the candidate
 * layout's RouteGuard gates to an authenticated CANDIDATE; the feature view
 * loads the applications and owns the loading / empty / error states.
 */
export default async function CandidateApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("applications.title")}
        description={t("applications.description")}
      />
      <ApplicationsListView />
    </PageContainer>
  );
}
