import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Card } from "@/components/ui";
import { SupportFormShell } from "@/features/support/components/SupportFormShell";

/** Career support page shell (spec §14.5). */
export default async function CareerSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");

  return (
    <Section spacing="md">
      <PageContainer>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <SupportFormShell />
          <div className="flex flex-col gap-6">
            <Card tone="subtle" className="flex flex-col gap-2">
              <h2 className="type-heading-3 text-text-primary">
                {t("explainerTitle")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("explainer")}
              </p>
            </Card>
            <Card tone="subtle" className="flex flex-col gap-2">
              <h2 className="type-heading-3 text-text-primary">
                {t("response.title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("response.body")}
              </p>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Section>
  );
}
