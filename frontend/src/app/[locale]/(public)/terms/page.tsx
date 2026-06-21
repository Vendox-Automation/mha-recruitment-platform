import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Alert, Card } from "@/components/ui";

const SECTIONS = [
  "acceptance",
  "accounts",
  "employers",
  "conduct",
  "limitations",
] as const;

/** Terms of use shell (spec §9.2 /terms, §11.9 trust). */
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.terms");

  return (
    <Section spacing="md">
      <PageContainer width="narrow">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <Alert tone="info" className="mt-6">
          {t("shellNote")}
        </Alert>
        <div className="mt-6 flex flex-col gap-4">
          {SECTIONS.map((key) => (
            <Card key={key} className="flex flex-col gap-2">
              <h2 className="type-heading-3 text-text-primary">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="type-body text-text-secondary">
                {t(`sections.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </PageContainer>
    </Section>
  );
}
