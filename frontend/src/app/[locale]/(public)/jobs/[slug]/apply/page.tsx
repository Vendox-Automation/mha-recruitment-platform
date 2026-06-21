import { setRequestLocale } from "next-intl/server";

import { PageContainer, Section } from "@/components/layout";
import { ApplyView } from "@/features/applications";

/**
 * Apply page (spec §10.1, §14.3). Composition only — the client `ApplyView`
 * gates by session (anonymous → sign in, non-candidate → no access), loads the
 * job + already-applied status, and renders the apply form or a "View
 * Application" path when the candidate has already applied.
 */
export default async function JobApplyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <Section spacing="md">
      <PageContainer width="narrow">
        <ApplyView slug={slug} />
      </PageContainer>
    </Section>
  );
}
