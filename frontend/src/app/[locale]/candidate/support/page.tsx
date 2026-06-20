import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { SupportFormShell } from "@/features/support/components/SupportFormShell";

/** Candidate in-app support shell (spec §14.9, §15.7). Reuses the support form. */
export default async function CandidateSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("support.title")}
        description={t("support.description")}
      />
      <div className="max-w-2xl">
        <SupportFormShell />
      </div>
    </PageContainer>
  );
}
