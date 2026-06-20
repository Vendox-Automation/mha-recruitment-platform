import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Employer job detail shell (spec §14.11). Honest not-found state this phase. */
export default async function EmployerJobDetailPage({
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
        href="/employer/jobs"
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("jobDetail.backToJobs")}
      </Link>
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("jobDetail.title")}
        actions={
          <div className="flex gap-2">
            <LinkButton
              href={`/employer/jobs/${id}/edit`}
              variant="secondary"
              size="sm"
            >
              {t("jobDetail.edit")}
            </LinkButton>
            <LinkButton href={`/employer/jobs/${id}/applicants`} size="sm">
              {t("jobDetail.viewApplicants")}
            </LinkButton>
          </div>
        }
      />
      <Card>
        <EmptyState
          title={t("jobDetail.notFoundTitle")}
          description={t("jobDetail.notFoundBody")}
        />
      </Card>
    </PageContainer>
  );
}
