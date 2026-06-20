import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Link } from "@/i18n/navigation";
import { EmployerJobEdit } from "@/features/jobs/components/EmployerJobEdit";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer job edit page (spec §14.11). Composition-only: the guard gates
 * approved employers; the feature component prefills the form, handles
 * not-found/error, and renders a read-only notice for admin-suspended jobs.
 */
export default async function EmployerJobEditPage({
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
        <Link
          href={`/employer/jobs/${id}`}
          className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
        >
          ← {t("jobDetailView.backToDetail")}
        </Link>
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("jobEditView.title")}
          description={t("jobEditView.description")}
        />
        <EmployerJobEdit id={id} />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
