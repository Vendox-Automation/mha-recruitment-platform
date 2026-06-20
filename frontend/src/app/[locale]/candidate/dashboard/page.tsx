import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, PageHeader } from "@/components/layout";
import {
  Alert,
  Card,
  EmptyState,
  LinkButton,
} from "@/components/ui";

const SNAPSHOT_KEYS = [
  "applied",
  "underReview",
  "shortlisted",
  "interview",
  "offered",
  "hired",
] as const;

/** Candidate dashboard shell — "career command centre" (spec §14.9). */
export default async function CandidateDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");

  return (
    <PageContainer width="wide" className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t("area.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <Alert tone="info">{t("protectedNote")}</Alert>

      {/* A. Welcome / next action */}
      <Card tone="subtle" className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("dashboard.nextAction.title")}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {t("dashboard.nextAction.body")}
        </p>
        <div className="mt-1">
          <LinkButton href="/candidate/profile" size="sm">
            {t("dashboard.nextAction.cta")}
          </LinkButton>
        </div>
      </Card>

      {/* B. Application snapshot (honest — no fabricated counts) */}
      <section className="flex flex-col gap-4">
        <h2 className="type-heading-2 text-text-primary">
          {t("dashboard.snapshot.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SNAPSHOT_KEYS.map((key) => (
            <Card key={key} className="flex flex-col gap-1">
              <span className="type-data text-text-muted" aria-hidden="true">
                —
              </span>
              <span className="type-caption">
                {t(`dashboard.snapshot.${key}`)}
              </span>
            </Card>
          ))}
        </div>
        <EmptyState
          compact
          title={t("dashboard.snapshot.emptyTitle")}
          description={t("dashboard.snapshot.emptyBody")}
          action={
            <LinkButton href="/jobs" variant="secondary" size="sm">
              {t("applications.browseJobs")}
            </LinkButton>
          }
        />
      </section>

      {/* C–F: journey, picks, resume, insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.journey.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.journey.title")}
            description={t("dashboard.journey.emptyBody")}
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.picks.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.picks.title")}
            description={t("dashboard.picks.emptyBody")}
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.resume.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.resume.title")}
            description={t("dashboard.resume.emptyBody")}
            action={
              <LinkButton href="/candidate/resume" variant="secondary" size="sm">
                {t("dashboard.resume.upload")}
              </LinkButton>
            }
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="type-heading-3 text-text-primary">
            {t("dashboard.insights.title")}
          </h2>
          <EmptyState
            compact
            title={t("dashboard.insights.title")}
            description={t("dashboard.insights.emptyBody")}
          />
        </Card>
      </div>
    </PageContainer>
  );
}
