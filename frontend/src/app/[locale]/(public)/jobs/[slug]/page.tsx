import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section } from "@/components/layout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  Tag,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { ShareJobButton } from "@/features/jobs/components/ShareJobButton";

/**
 * Job detail page shell (spec §14.3). Decision-first header, primary actions
 * (Apply / Save / Share), a sticky application panel on desktop and a sticky
 * bottom action bar on mobile, plus the prescribed content sections. Static
 * shell — no live job data; missing-data behaviour (hide empty labels) is
 * applied by simply omitting optional blocks (spec §14.3 missing-data).
 */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs.detail");
  const tCommon = await getTranslations("common");
  const tBadge = await getTranslations("common.badge");

  const sectionKeys = [
    "overview",
    "description",
    "requirements",
    "jobFit",
    "company",
    "similar",
  ] as const;

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <Link
          href="/jobs"
          className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
        >
          ← {t("backToSearch")}
        </Link>

        <Alert tone="info" className="mt-4">
          {tCommon("states.shellNotice")}
        </Alert>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
          {/* Main column */}
          <div className="flex flex-col gap-6">
            {/* Decision-first header */}
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="approved" withDot>
                  {tBadge("approvedEmployer")}
                </Badge>
                <Badge tone="supported">{tBadge("mhaSupported")}</Badge>
                <Badge tone="easyApply">{tBadge("easyApply")}</Badge>
              </div>
              <h1 className="type-heading-1 text-text-primary">
                {t("sections.overview")}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Tag>—</Tag>
                <Tag>—</Tag>
                <Tag>—</Tag>
              </div>
            </header>

            {/* Sections */}
            {sectionKeys.map((key) => (
              <Card key={key} className="flex flex-col gap-3">
                <h2 className="type-heading-2 text-text-primary">
                  {t(`sections.${key}`)}
                </h2>
                {key === "jobFit" ? (
                  <div className="flex flex-col gap-3">
                    <p className="type-body-sm text-text-secondary">
                      {t("fit.previewBody")}
                    </p>
                    <Alert tone="info" title={t("fit.previewTitle")}>
                      {t("fit.disclaimer")}
                    </Alert>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    title={tCommon("states.emptyTitle")}
                    description={tCommon("states.emptyDescription")}
                  />
                )}
              </Card>
            ))}

            {/* MHA support prompt */}
            <Card tone="subtle" className="flex flex-col gap-2">
              <h2 className="type-heading-3 text-text-primary">
                {t("support.title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("support.body")}
              </p>
              <div className="mt-1">
                <LinkButton href="/career-support" variant="secondary" size="sm">
                  {t("support.cta")}
                </LinkButton>
              </div>
            </Card>
          </div>

          {/* Sticky application panel (desktop) */}
          <aside className="hidden lg:block">
            <Card className="sticky top-24 flex flex-col gap-3">
              <h2 className="type-heading-3 text-text-primary">
                {t("panel.title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("panel.signInPrompt")}
              </p>
              <Button fullWidth>{t("applyNow")}</Button>
              <Button variant="secondary" fullWidth>
                {t("saveJob")}
              </Button>
              <ShareJobButton fullWidth />
            </Card>
          </aside>
        </div>
      </PageContainer>

      {/* Sticky bottom action bar (mobile) */}
      <div className="sticky bottom-0 z-30 border-t border-border-default bg-surface-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <Button fullWidth>{t("applyNow")}</Button>
          <Button variant="secondary">{t("saveJob")}</Button>
        </div>
      </div>
    </Section>
  );
}
