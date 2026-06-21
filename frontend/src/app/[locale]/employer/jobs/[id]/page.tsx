import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { EmployerJobDetail } from "@/features/jobs/components/EmployerJobDetail";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer job detail/preview page (spec §14.11). Composition-only: the guard
 * gates approved employers; the feature component owns loading, the fields,
 * screening questions, lifecycle actions, and not-found/error states.
 */
export default async function EmployerJobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer className="flex flex-col gap-8">
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("jobDetailView.title")}
          description={t("jobDetailView.description")}
        />
        <EmployerJobDetail id={id} />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
