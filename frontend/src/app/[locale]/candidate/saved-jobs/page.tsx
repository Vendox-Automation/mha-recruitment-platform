import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState, LinkButton } from "@/components/ui";

/** Candidate saved jobs shell (spec §14.9, §15.5). */
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
      <Card>
        <EmptyState
          title={t("savedJobs.emptyTitle")}
          description={t("savedJobs.emptyBody")}
          action={
            <LinkButton href="/jobs" variant="secondary" size="sm">
              {t("savedJobs.browseJobs")}
            </LinkButton>
          }
        />
      </Card>
    </PageContainer>
  );
}
