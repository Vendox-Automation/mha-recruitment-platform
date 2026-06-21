import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { ResumeManager } from "@/features/candidates";

/**
 * Candidate resume management (spec §14.9 E, §22.2 private resume). Composition
 * only: the candidate layout's RouteGuard gates access; the feature manager
 * handles upload/replace/remove and the permission-checked download link.
 */
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
      <ResumeManager />
    </PageContainer>
  );
}
