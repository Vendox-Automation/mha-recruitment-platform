import { setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout";
import { ApplicationDetailView } from "@/features/applications";

/**
 * Candidate application detail (spec §14.9 C, §15.4). Composition only — the
 * candidate layout's RouteGuard gates to an authenticated CANDIDATE; the feature
 * view loads the application and owns the stage meaning, status timeline,
 * submission, and not-found / permission / error states.
 */
export default async function CandidateApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <PageContainer className="flex flex-col gap-8">
      <ApplicationDetailView id={id} />
    </PageContainer>
  );
}
