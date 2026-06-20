import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import { Alert, Badge, Card, LinkButton } from "@/components/ui";

/**
 * Employer pending-approval shell (spec §14.8, §8.3). Honest pending state with
 * status, submitted info placeholder, next step, and a contact path. The
 * rejection variant is documented in messages (employer.pending.rejected) and
 * rendered server-side once approval status is wired in Phase 3.
 */
export default async function EmployerPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");

  return (
    <PageContainer width="narrow" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("pending.title")}
        description={t("pending.description")}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="type-label text-text-primary">
            {t("pending.statusLabel")}
          </span>
          <Badge tone="warning" withDot>
            {t("pending.statusPending")}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="type-heading-3 text-text-primary">
            {t("pending.nextStepTitle")}
          </h2>
          <p className="type-body-sm text-text-secondary">
            {t("pending.nextStepBody")}
          </p>
        </div>
        <Alert tone="info">{t("protectedNote")}</Alert>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/employer/company-profile" variant="secondary" size="sm">
            {t("companyProfile.edit")}
          </LinkButton>
          <LinkButton href="/career-support" variant="ghost" size="sm">
            {t("pending.contactCta")}
          </LinkButton>
        </div>
      </Card>
    </PageContainer>
  );
}
