import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { EmployerApprovalQueue } from "@/features/admin";

/**
 * Admin employer approval queue (admin scope). Composition only — the admin
 * layout's RouteGuard gates to an authenticated ADMIN; the feature view owns
 * the filter / search / pagination, the per-row actions, and all states.
 */
export default async function AdminEmployersPage({
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
        title={t("employers.title")}
        description={t("employers.description")}
      />
      <EmployerApprovalQueue />
    </PageContainer>
  );
}
