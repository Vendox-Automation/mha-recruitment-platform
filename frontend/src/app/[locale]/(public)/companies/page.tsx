import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader, Section } from "@/components/layout";
import { CompanyDirectory } from "@/features/companies/components/CompanyDirectory";

/**
 * Company directory page (spec §14.4). Composition only — the client
 * `CompanyDirectory` owns name search, pagination, URL state, and fetching.
 */
export default async function CompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies.directory");

  const sp = await searchParams;
  const initial = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") initial.set(key, value);
    else if (Array.isArray(value) && value[0]) initial.set(key, value[0]);
  }

  return (
    <Section spacing="md">
      <PageContainer>
        <PageHeader title={t("title")} description={t("lead")} />
        <div className="mt-8">
          <CompanyDirectory initialQuery={initial.toString()} />
        </div>
      </PageContainer>
    </Section>
  );
}
