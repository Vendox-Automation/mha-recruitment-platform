import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitcher, PageContainer, PageHeader } from "@/components/layout";
import { Card } from "@/components/ui";

/** Employer settings shell (spec §14.10, §17.2 language). */
export default async function EmployerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");
  const tCandidate = await getTranslations("candidate.settings");

  return (
    <PageContainer width="narrow" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="type-heading-3 text-text-primary">
            {tCandidate("language")}
          </h2>
          <LocaleSwitcher />
        </div>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("settings.title")}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {t("settings.emptyBody")}
        </p>
      </Card>
    </PageContainer>
  );
}
