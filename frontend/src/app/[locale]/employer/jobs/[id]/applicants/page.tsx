import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { ApplicantWorkspace } from "@/features/applicants";
import { Link } from "@/i18n/navigation";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer applicant management workspace (spec §14.12). Composition only: the
 * page resolves the route params and renders the client {@link ApplicantWorkspace}
 * (table / Kanban / split-screen) for one owned job. Wrapped in
 * {@link EmployerWorkspaceGuard} so only an APPROVED employer reaches it.
 */
export default async function EmployerApplicantsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
      <PageContainer width="wide" className="flex flex-col gap-8">
        <Link
          href={`/employer/jobs/${id}`}
          className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
        >
          ← {t("jobDetail.backToJobs")}
        </Link>
        <PageHeader
          eyebrow={t("area.eyebrow")}
          title={t("applicants.title")}
          description={t("applicants.description")}
        />
        <ApplicantWorkspace jobId={id} />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
