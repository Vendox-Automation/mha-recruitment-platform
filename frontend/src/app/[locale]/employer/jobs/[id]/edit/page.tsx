import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { JobFormShell } from "@/features/employers/components/JobFormShell";
import { Link } from "@/i18n/navigation";

/** Employer job edit shell (spec §14.11). Reuses the job form. */
export default async function EmployerJobEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <PageContainer className="flex flex-col gap-8">
      <Link
        href={`/employer/jobs/${id}`}
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("jobDetail.backToJobs")}
      </Link>
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("jobEdit.title")}
        description={t("jobEdit.description")}
      />
      <JobFormShell />
    </PageContainer>
  );
}
