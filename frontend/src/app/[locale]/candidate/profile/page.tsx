import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { CandidateProfileView } from "@/features/candidates";

/**
 * Candidate profile (spec §14.7). Composition only: the candidate layout's
 * RouteGuard gates access; the feature view loads + edits the profile via
 * GET/PATCH /candidate/profile/ and shows a read-only resume summary.
 */
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
      <CandidateProfileView />
    </PageContainer>
  );
}
