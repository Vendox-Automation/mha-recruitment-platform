import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { CompanyProfileView } from "@/features/employers";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Approved-employer company profile (spec §14.4/§14.10). Composition only:
 * `EmployerWorkspaceGuard` gates to approved employers (pending employers are
 * redirected to /employer/pending), and the feature view loads/edits the
 * profile via GET/PATCH /employer/profile/.
 */
export default async function EmployerCompanyProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer className="flex flex-col gap-8">
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("companyProfile.title")}
          description={t("companyProfile.description")}
        />
        <CompanyProfileView />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
