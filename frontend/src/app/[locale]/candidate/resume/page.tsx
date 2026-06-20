import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState } from "@/components/ui";

/** Candidate resume management shell (spec §14.9 E, §22.2 private resume). */
export default async function CandidateResumePage({
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
        title={t("resume.title")}
        description={t("resume.description")}
      />
      <Card>
        <EmptyState
          title={t("resume.emptyTitle")}
          description={t("resume.emptyBody")}
        />
      </Card>
    </PageContainer>
  );
}
