import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState, LinkButton } from "@/components/ui";

/** Candidate profile shell (spec §14.9 E). */
export default async function CandidateProfilePage({
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
        title={t("profile.title")}
        description={t("profile.description")}
      />
      <Card>
        <EmptyState
          title={t("profile.emptyTitle")}
          description={t("profile.emptyBody")}
          action={
            <LinkButton href="/candidate/resume" variant="secondary" size="sm">
              {t("resume.upload")}
            </LinkButton>
          }
        />
      </Card>
    </PageContainer>
  );
}
