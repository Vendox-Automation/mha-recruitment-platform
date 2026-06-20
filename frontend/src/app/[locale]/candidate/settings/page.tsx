import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitcher, PageContainer, PageHeader } from "@/components/layout";
import { Card } from "@/components/ui";

/** Candidate settings shell (spec §14.9, §17.2 language). */
export default async function CandidateSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

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
            {t("settings.language")}
          </h2>
          <LocaleSwitcher />
        </div>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("settings.account")}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {t("settings.emptyBody")}
        </p>
      </Card>
    </PageContainer>
  );
}
