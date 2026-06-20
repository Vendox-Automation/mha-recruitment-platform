import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { ApplicantWorkspaceShell } from "@/features/employers/components/ApplicantWorkspaceShell";
import { Link } from "@/i18n/navigation";

/** Employer applicant management shell (spec §14.12). */
export default async function EmployerApplicantsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
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
      <ApplicantWorkspaceShell />
    </PageContainer>
  );
}
