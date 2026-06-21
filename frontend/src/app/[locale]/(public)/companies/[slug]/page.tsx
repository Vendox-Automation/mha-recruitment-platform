import { setRequestLocale } from "next-intl/server";

import { PageContainer, Section } from "@/components/layout";
import { CompanyDetailView } from "@/features/companies/components/CompanyDetailView";

/**
 * Company detail page (spec §14.4). Composition only — the client
 * `CompanyDetailView` fetches the approved company by slug and renders the
 * profile, optional culture/benefits, and active public jobs.
 */
export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <Section spacing="md">
      <PageContainer>
        <CompanyDetailView slug={slug} />
      </PageContainer>
    </Section>
  );
}
