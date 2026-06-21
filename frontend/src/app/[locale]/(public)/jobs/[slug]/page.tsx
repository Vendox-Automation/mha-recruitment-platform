import { setRequestLocale } from "next-intl/server";

import { PageContainer, Section } from "@/components/layout";
import { JobDetailView } from "@/features/jobs/components/JobDetailView";

/**
 * Job detail page (spec §14.3). Composition only — the client `JobDetailView`
 * fetches the public job by slug and renders the decision-first header,
 * session-aware actions, content sections, sticky panels, and the
 * loading / error / not-found states.
 */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <JobDetailView slug={slug} />
      </PageContainer>
    </Section>
  );
}
