import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { ReviewModerationTable } from "@/features/admin";

/**
 * Admin review moderation (admin scope). Composition only — the admin layout's
 * RouteGuard gates to an authenticated ADMIN; the feature view owns the company
 * filter / search / pagination, the per-row delete actions, and all states.
 */
export default async function AdminReviewsPage({
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
        title={t("reviews.title")}
        description={t("reviews.description")}
      />
      <ReviewModerationTable />
    </PageContainer>
  );
}
