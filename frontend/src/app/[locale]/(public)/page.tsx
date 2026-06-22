import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  PageContainer,
  Section,
  SectionHeading,
} from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";
import { parsePerspective } from "@/features/home/perspective";
import { FinalCta } from "@/features/home/components/FinalCta";
import { HeroPerspective } from "@/features/home/components/HeroPerspective";
import { HomeProviders } from "@/features/home/components/HomeProviders";
import { JourneySteps } from "@/features/home/components/JourneySteps";
import { LazyConsole } from "@/features/home/components/LazyConsole";
import { LazyOpportunities } from "@/features/home/components/LazyOpportunities";
import { Reveal } from "@/features/home/components/Reveal";
import { TrustedBy } from "@/features/home/components/TrustedBy";
import { ValuePanel } from "@/features/home/components/ValuePanel";
import { WorkspacePreview } from "@/features/home/components/WorkspacePreview";

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
 * Executive homepage (spec §14.1) — the signature "wow" surface. Delivers the
 * full section order A–K: an integrated executive hero with equal
 * candidate/employer perspective controls, a perspective value panel, the
 * Career Intelligence Console (real platform analytics + MHA insights +
 * clearly-labelled illustrative previews), real latest opportunities, the
 * architectural journey, the MHA expert layer, an honest employer workspace
 * preview, the trust & operating model, and a final dual CTA.
 *
 * Composition-only (ADR-0001 §3.2): every section lives in
 * `features/home/components` or `components/intelligence`. The page reads
 * `?view=` to seed the perspective server-side so a shared link opens in the
 * right lens, then hands its server-rendered section tree to {@link HomeProviders}
 * (shared perspective + scoped framer-motion). All content is meaningful before
 * JS hydrates; motion is purposeful and reduced-motion-safe.
 */
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const { view } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const initialPerspective = parsePerspective(view) ?? undefined;

  return (
    <HomeProviders initialPerspective={initialPerspective}>
      {/* B. Integrated executive hero (first viewport: immediate perspective + CTA). */}
      <Section spacing="sm" className="border-b border-border-default">
        <HeroPerspective />
      </Section>

      {/* B2. Trusted-by social proof — synthetic POC data, clearly labelled. */}
      <Section className="border-b border-border-default">
        <PageContainer width="wide">
          <Reveal>
            <TrustedBy />
          </Reveal>
        </PageContainer>
      </Section>

      {/* C. Perspective value panel */}
      <Section tone="raised">
        <PageContainer>
          <Reveal>
            <ValuePanel />
          </Reveal>
        </PageContainer>
      </Section>

      {/* D. Career Intelligence Console (lazy, real-sourced, never a ticker). */}
      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("console.eyebrow")}
            title={t("console.title")}
            lead={t("console.lead")}
          />
          <Reveal className="mt-8">
            <LazyConsole />
          </Reveal>
        </PageContainer>
      </Section>

      {/* E. Opportunities and organisations (lazy, real data, honest empties). */}
      <Section tone="raised">
        <PageContainer>
          <SectionHeading
            eyebrow={t("opportunities.eyebrow")}
            title={t("opportunities.title")}
          />
          <Reveal className="mt-8">
            <LazyOpportunities />
          </Reveal>
        </PageContainer>
      </Section>

      {/* F. How the journey works */}
      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("journey.eyebrow")}
            title={t("journey.title")}
          />
          <Reveal className="mt-8">
            <JourneySteps />
          </Reveal>
        </PageContainer>
      </Section>

      {/* G. MHA expert layer */}
      <Section tone="inverse">
        <PageContainer>
          <Reveal>
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
          </Reveal>
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
          <Reveal className="mt-8">
            <WorkspacePreview />
          </Reveal>
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
            ].map((key, index) => (
              <Reveal key={key} delay={index * 0.04}>
                <Card tone="subtle" className="flex h-full flex-col gap-2">
                  <h3 className="type-heading-3 text-text-primary">
                    {t(`trust.${key}.title`)}
                  </h3>
                  <p className="type-body-sm text-text-secondary">
                    {t(`trust.${key}.body`)}
                  </p>
                </Card>
              </Reveal>
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
          <FinalCta />
        </PageContainer>
      </Section>
    </HomeProviders>
  );
}
