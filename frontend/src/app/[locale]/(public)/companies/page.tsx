import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader, Section } from "@/components/layout";
import { EmptyState, Field, Input } from "@/components/ui";

/** Company directory shell (spec §14.4). Search control + honest empty state. */
export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies.directory");

  return (
    <Section spacing="md">
      <PageContainer>
        <PageHeader title={t("title")} description={t("lead")} />
        <div className="mt-8 flex flex-col gap-6">
          <div className="max-w-md">
            <Field label={t("searchLabel")}>
              <Input
                type="search"
                placeholder={t("searchPlaceholder")}
              />
            </Field>
          </div>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </div>
      </PageContainer>
    </Section>
  );
}
