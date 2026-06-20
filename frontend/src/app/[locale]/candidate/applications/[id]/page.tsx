import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/**
 * Candidate application detail shell (spec §14.9 C, §5.7). With no live data
 * this phase, it demonstrates the not-found / no-access state honestly.
 */
export default async function CandidateApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

  return (
    <PageContainer className="flex flex-col gap-8">
      <Link
        href="/candidate/applications"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("applicationDetail.backToApplications")}
      </Link>
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("applicationDetail.title")}
      />
      <Card>
        <EmptyState
          title={t("applicationDetail.notFoundTitle")}
          description={t("applicationDetail.notFoundBody")}
        />
      </Card>
    </PageContainer>
  );
}
