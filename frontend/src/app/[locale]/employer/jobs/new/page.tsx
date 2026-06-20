import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Link } from "@/i18n/navigation";
import { EmployerJobCreate } from "@/features/jobs/components/EmployerJobCreate";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer new-job page (spec §14.11). Composition-only: the guard gates
 * approved employers; the feature component owns the form and create flow.
 */
export default async function EmployerNewJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer.jobForm");
  const tArea = await getTranslations("employer.area");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer className="flex flex-col gap-8">
        <Link
          href="/employer/jobs"
          className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
        >
          ← {t("backToJobs")}
        </Link>
        <PageHeader
          eyebrow={tArea("eyebrow")}
          title={t("createTitle")}
          description={t("createDescription")}
        />
        <EmployerJobCreate />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
