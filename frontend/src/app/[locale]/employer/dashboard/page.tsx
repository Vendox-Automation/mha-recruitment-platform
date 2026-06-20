import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { LinkButton } from "@/components/ui";
import { EmployerDashboardView } from "@/features/applicants";
import { EmployerWorkspaceGuard } from "@/lib/auth";

/**
 * Employer dashboard — guided recruitment workspace (spec §14.10). Composition
 * only: the page provides the header and quick actions, then renders the client
 * {@link EmployerDashboardView}, which loads the real attention queue, active
 * jobs, and pipeline counts. Wrapped in {@link EmployerWorkspaceGuard}: only an
 * APPROVED employer reaches this; pending/rejected/suspended are routed to
 * /employer/pending.
 */
export default async function EmployerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <EmployerWorkspaceGuard>
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
        <EmployerDashboardView />
      </PageContainer>
    </EmployerWorkspaceGuard>
  );
}
