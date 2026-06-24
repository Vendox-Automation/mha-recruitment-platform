import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { AdminDashboardView } from "@/features/admin";

/**
 * Admin dashboard (admin scope). Composition only — the admin layout's
 * RouteGuard gates to an authenticated ADMIN; the feature view loads the
 * approval-count summary and owns the loading / error / zero states.
 */
export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <PageContainer width="wide" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />
      <AdminDashboardView />
    </PageContainer>
  );
}
