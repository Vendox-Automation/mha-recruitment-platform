import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState, LinkButton } from "@/components/ui";

/** Candidate applications list shell (spec §14.9 C, §5.7 transparency). */
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
      <Card>
        <EmptyState
          title={t("applications.emptyTitle")}
          description={t("applications.emptyBody")}
          action={
            <LinkButton href="/jobs" variant="secondary" size="sm">
              {t("applications.browseJobs")}
            </LinkButton>
          }
        />
      </Card>
    </PageContainer>
  );
}
