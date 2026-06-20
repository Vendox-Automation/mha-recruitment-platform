import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Alert, Card, EmptyState, LinkButton } from "@/components/ui";

/** Employer dashboard shell — guided recruitment workspace (spec §14.10). */
export default async function EmployerDashboardPage({
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
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <LinkButton href="/employer/jobs/new" size="sm">
            {t("dashboard.quickActions.postJob")}
          </LinkButton>
        }
      />

      <Alert tone="info">{t("protectedNote")}</Alert>

      {/* A. Attention queue */}
      <Card className="flex flex-col gap-4">
        <h2 className="type-heading-3 text-text-primary">
          {t("dashboard.attention.title")}
        </h2>
        <EmptyState
          compact
          title={t("dashboard.attention.title")}
          description={t("dashboard.attention.emptyBody")}
        />
      </Card>

      {/* B. Quick actions */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("dashboard.quickActions.title")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LinkButton href="/employer/jobs/new" fullWidth>
            {t("dashboard.quickActions.postJob")}
          </LinkButton>
          <LinkButton href="/employer/jobs" variant="secondary" fullWidth>
            {t("dashboard.quickActions.reviewApplicants")}
          </LinkButton>
          <LinkButton href="/employer/jobs" variant="secondary" fullWidth>
            {t("dashboard.quickActions.viewJobs")}
          </LinkButton>
          <LinkButton href="/employer/analytics" variant="secondary" fullWidth>
            {t("dashboard.quickActions.viewAnalytics")}
          </LinkButton>
        </div>
      </section>

      {/* C + D + E */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.activeJobs.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.activeJobs.title")}
            description={t("dashboard.activeJobs.emptyBody")}
            action={
              <LinkButton href="/employer/jobs/new" variant="secondary" size="sm">
                {t("dashboard.quickActions.postJob")}
              </LinkButton>
            }
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.pipeline.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.pipeline.title")}
            description={t("dashboard.pipeline.emptyBody")}
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.insights.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.insights.title")}
            description={t("dashboard.insights.emptyBody")}
          />
        </Card>

        {/* F. Guided setup */}
        <Card tone="subtle" className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.setup.title")}
          </h2>
          <ol className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft text-sm font-semibold text-brand-primary-strong"
                >
                  {n}
                </span>
                <span className="type-body-sm text-text-secondary">
                  {t(`dashboard.setup.step${n}`)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </PageContainer>
  );
}
