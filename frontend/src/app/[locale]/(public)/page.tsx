import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  AnalyticalGraphic,
  IntelligenceCard,
} from "@/components/intelligence";
import {
  PageContainer,
  Section,
  SectionHeading,
} from "@/components/layout";
import {
  Card,
  EmptyState,
  LinkButton,
} from "@/components/ui";
import { HeroPerspective } from "@/features/home/components/HeroPerspective";
import { JourneySteps } from "@/features/home/components/JourneySteps";
import { ValuePanel } from "@/features/home/components/ValuePanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });
  return { title: t("title") };
}

/**
 * Executive homepage shell (spec §14.1). Phase 1 delivers the full section
 * sequence, perspective switching, the Career Intelligence Console (with honest
 * source labels), and editorial storytelling — using static/illustrative
 * content and honest empty states. No fake live metrics, no mascots. Live data
 * is connected in later phases.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <>
      {/* B. Integrated executive hero */}
      <Section spacing="sm" className="border-b border-border-default">
        <HeroPerspective />
      </Section>

      {/* C. Perspective value panel */}
      <Section tone="raised">
        <PageContainer>
          <ValuePanel />
        </PageContainer>
      </Section>

      {/* D. Career Intelligence Console */}
      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("console.eyebrow")}
            title={t("console.title")}
            lead={t("console.lead")}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <IntelligenceCard
              title={t("console.rolesInFocus.title")}
              body={t("console.rolesInFocus.body")}
              source="mhaInsight"
            />
            <IntelligenceCard
              title={t("console.hiringOutlook.title")}
              body={t("console.hiringOutlook.body")}
              source="mhaInsight"
            />
            <IntelligenceCard
              title={t("console.salaryGuidance.title")}
              body={t("console.salaryGuidance.body")}
              source="mhaInsight"
            />
            <IntelligenceCard
              title={t("console.skillsThemes.title")}
              body={t("console.skillsThemes.body")}
              source="illustrativePreview"
              note={t("console.previewNote")}
            />
          </div>
        </PageContainer>
      </Section>

      {/* E. Opportunities and organisations (honest empty states) */}
      <Section tone="raised">
        <PageContainer>
          <SectionHeading
            eyebrow={t("opportunities.eyebrow")}
            title={t("opportunities.title")}
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="type-heading-3 text-text-primary">
                {t("opportunities.jobsTitle")}
              </h3>
              <EmptyState
                title={t("opportunities.jobsTitle")}
                description={t("opportunities.jobsEmpty")}
                action={
                  <LinkButton href="/jobs" variant="secondary" size="sm">
                    {t("opportunities.jobsCta")}
                  </LinkButton>
                }
              />
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="type-heading-3 text-text-primary">
                {t("opportunities.companiesTitle")}
              </h3>
              <EmptyState
                title={t("opportunities.companiesTitle")}
                description={t("opportunities.companiesEmpty")}
                action={
                  <LinkButton href="/companies" variant="secondary" size="sm">
                    {t("opportunities.companiesCta")}
                  </LinkButton>
                }
              />
            </div>
          </div>
        </PageContainer>
      </Section>

      {/* F. How the journey works */}
      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("journey.eyebrow")}
            title={t("journey.title")}
          />
          <div className="mt-8">
            <JourneySteps />
          </div>
        </PageContainer>
      </Section>

      {/* G. MHA expert layer */}
      <Section tone="inverse">
        <PageContainer>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <SectionHeading
              eyebrow={t("expert.eyebrow")}
              title={t("expert.title")}
              lead={t("expert.lead")}
              tone="inverse"
            />
            <Card tone="inverse" className="flex flex-col gap-3">
              <ul className="flex flex-col gap-3">
                {[
                  "careerSupport",
                  "resumeHelp",
                  "vacancyHelp",
                  "recruitmentHelp",
                ].map((key) => (
                  <li
                    key={key}
                    className="type-body flex items-start gap-3 text-text-inverse/90"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary-soft"
                    />
                    {t(`expert.${key}`)}
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <LinkButton href="/career-support" variant="primary">
                  {t("expert.cta")}
                </LinkButton>
              </div>
            </Card>
          </div>
        </PageContainer>
      </Section>

      {/* H. Employer workspace preview (honest interface preview) */}
      <Section tone="raised">
        <PageContainer>
          <SectionHeading
            eyebrow={t("workspace.eyebrow")}
            title={t("workspace.title")}
            lead={t("workspace.lead")}
          />
          <Card className="mt-8 flex flex-col gap-5" padded>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "attentionQueue",
                "activeJobs",
                "applicantTable",
                "kanban",
                "insights",
              ].map((key) => (
                <div
                  key={key}
                  className="rounded-md border border-border-default bg-surface-raised p-4"
                >
                  <p className="type-label text-text-primary">
                    {t(`workspace.${key}`)}
                  </p>
                  <div
                    aria-hidden="true"
                    className="mt-3 flex flex-col gap-2"
                  >
                    <span className="h-2 w-3/4 rounded-full bg-surface-subtle" />
                    <span className="h-2 w-1/2 rounded-full bg-surface-subtle" />
                    <span className="h-2 w-2/3 rounded-full bg-surface-subtle" />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center rounded-md border border-dashed border-border-strong p-4">
                <AnalyticalGraphic className="max-h-28" />
              </div>
            </div>
            <p className="type-caption">{t("workspace.previewNote")}</p>
          </Card>
        </PageContainer>
      </Section>

      {/* I. Trust and operating model */}
      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("trust.eyebrow")}
            title={t("trust.title")}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "operatedBy",
              "approval",
              "privacy",
              "fitLimits",
              "humanSupport",
              "responsibleData",
            ].map((key) => (
              <Card key={key} tone="subtle" className="flex flex-col gap-2">
                <h3 className="type-heading-3 text-text-primary">
                  {t(`trust.${key}.title`)}
                </h3>
                <p className="type-body-sm text-text-secondary">
                  {t(`trust.${key}.body`)}
                </p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </Section>

      {/* J. Final dual call to action */}
      <Section tone="raised" spacing="lg">
        <PageContainer>
          <SectionHeading
            eyebrow={t("finalCta.eyebrow")}
            title={t("finalCta.title")}
            align="center"
          />
          <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
            <Card className="flex flex-col gap-3">
              <h3 className="type-heading-3 text-text-primary">
                {t("finalCta.candidateTitle")}
              </h3>
              <p className="type-body-sm text-text-secondary">
                {t("finalCta.candidateBody")}
              </p>
              <div className="mt-1">
                <LinkButton href="/register/candidate" fullWidth>
                  {t("finalCta.candidateCta")}
                </LinkButton>
              </div>
            </Card>
            <Card className="flex flex-col gap-3">
              <h3 className="type-heading-3 text-text-primary">
                {t("finalCta.employerTitle")}
              </h3>
              <p className="type-body-sm text-text-secondary">
                {t("finalCta.employerBody")}
              </p>
              <div className="mt-1">
                <LinkButton
                  href="/register/employer"
                  variant="secondary"
                  fullWidth
                >
                  {t("finalCta.employerCta")}
                </LinkButton>
              </div>
            </Card>
          </div>
        </PageContainer>
      </Section>
    </>
  );
}
