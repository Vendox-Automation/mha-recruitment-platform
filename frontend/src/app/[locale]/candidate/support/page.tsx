import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { SupportForm } from "@/features/support/components/SupportForm";
import { SupportHistory } from "@/features/support/components/SupportHistory";

/**
 * Candidate in-app support (spec §14.9, §15.7). Composition only: the candidate
 * can raise a new request (the shared support form, prefilled from their
 * session) and review their own request history below.
 */
export default async function CandidateSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate.support");
  const tArea = await getTranslations("candidate.area");

  return (
    <PageContainer className="flex flex-col gap-8">
      <PageHeader
        eyebrow={tArea("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="support-new-heading" className="flex flex-col gap-4">
          <h2
            id="support-new-heading"
            className="type-heading-3 text-text-primary"
          >
            {t("newRequestTitle")}
          </h2>
          <SupportForm />
        </section>
        <section
          aria-labelledby="support-history-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="support-history-heading"
            className="type-heading-3 text-text-primary"
          >
            {t("historyTitle")}
          </h2>
          <SupportHistory />
        </section>
      </div>
    </PageContainer>
  );
}
