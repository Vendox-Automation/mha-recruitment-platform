import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader, Section } from "@/components/layout";
import { JobSearch } from "@/features/jobs/components/JobSearch";

/**
 * Job search results page (spec §14.2). Composition only — the page reads the
 * incoming URL query string and hands it to the client `JobSearch` feature
 * component, which owns filter/sort/page state, fetching, and the split-screen
 * vs. drawer responsive behaviour (spec §15.3 URL state).
 */
export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs.search");

  // Serialise the incoming searchParams to a plain query string so the client
  // component can seed its state from a shared/bookmarked URL.
  const sp = await searchParams;
  const initial = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") initial.set(key, value);
    else if (Array.isArray(value) && value[0]) initial.set(key, value[0]);
  }

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("lead")} />
        <div className="mt-8">
          <JobSearch initialQuery={initial.toString()} />
        </div>
      </PageContainer>
    </Section>
  );
}
