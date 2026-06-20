import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState, LinkButton } from "@/components/ui";

/** Employer jobs list shell (spec §14.11). */
export default async function EmployerJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
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
      <Card>
        <EmptyState
          title={t("jobs.emptyTitle")}
          description={t("jobs.emptyBody")}
          action={
            <LinkButton href="/employer/jobs/new" variant="secondary" size="sm">
              {t("jobs.newJob")}
            </LinkButton>
          }
        />
      </Card>
    </PageContainer>
  );
}
