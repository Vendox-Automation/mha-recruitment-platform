import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader, Section } from "@/components/layout";
import { JobSearchShell } from "@/features/jobs/components/JobSearchShell";

/** Job search results page (spec §14.2). */
export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs.search");

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("lead")} />
        <div className="mt-8">
          <JobSearchShell />
        </div>
      </PageContainer>
    </Section>
  );
}
