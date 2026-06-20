import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState } from "@/components/ui";

/** Employer company profile shell (spec §14.4 detail, §14.10). */
export default async function EmployerCompanyProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("companyProfile.title")}
        description={t("companyProfile.description")}
      />
      <Card>
        <EmptyState
          title={t("companyProfile.emptyTitle")}
          description={t("companyProfile.emptyBody")}
        />
      </Card>
    </PageContainer>
  );
}
