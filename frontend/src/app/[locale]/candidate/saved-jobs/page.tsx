import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { SavedJobsView } from "@/features/jobs/components/SavedJobsView";

/** Candidate saved jobs (spec §14.9, §15.5). Composition only — UI in the feature. */
export default async function CandidateSavedJobsPage({
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
        title={t("savedJobs.title")}
        description={t("savedJobs.description")}
      />
      <SavedJobsView />
    </PageContainer>
  );
}
