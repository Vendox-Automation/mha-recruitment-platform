import { setRequestLocale } from "next-intl/server";

import { EmployerApprovalView } from "@/features/employers";

/**
 * Employer approval screen (spec §14.8, §8.3–8.5). Catch-all for NON-APPROVED
 * employers (PENDING / REJECTED / SUSPENDED); the feature view fetches the
 * approval status and renders the state-specific content. Composition only.
 */
export default async function EmployerPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EmployerApprovalView />;
}
