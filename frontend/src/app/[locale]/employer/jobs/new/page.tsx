import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { JobFormShell } from "@/features/employers/components/JobFormShell";

/** Employer new job shell (spec §14.11). */
export default async function EmployerNewJobPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer.newJob");
  const tArea = await getTranslations("employer.area");

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow={tArea("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <JobFormShell />
    </PageContainer>
  );
}
