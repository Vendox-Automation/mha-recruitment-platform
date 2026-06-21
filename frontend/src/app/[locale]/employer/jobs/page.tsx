import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { LinkButton } from "@/components/ui";
import { EmployerJobsList } from "@/features/jobs/components/EmployerJobsList";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer jobs list page (spec §14.11). Composition-only: the guard gates
 * approved employers (pending → /employer/pending) and the feature component
 * owns data loading, states, and lifecycle actions.
 */
export default async function EmployerJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer width="wide" className="flex flex-col gap-8">
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("jobs.title")}
          description={t("jobs.description")}
          actions={
            <LinkButton href="/employer/jobs/new" size="sm">
              {t("jobs.newJob")}
            </LinkButton>
          }
        />
        <EmployerJobsList />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
