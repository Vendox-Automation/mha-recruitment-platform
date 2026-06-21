import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";

/**
 * Employer landing page (spec §9.1 "For Employers", §14.1 H). Editorial
 * employer-perspective storytelling reusing the home employer value content,
 * with a clear path into registration.
 */
export default async function ForEmployersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tValue = await getTranslations("home.value.employer");

  const pillars = ["publishing", "review", "pipeline", "expertise"] as const;

  return (
    <>
      <Section spacing="md" className="border-b border-border-default">
        <PageContainer>
          <SectionHeading
            eyebrow={t("hero.eyebrow")}
            title={t("hero.employer.lead")}
            lead={t("workspace.lead")}
            as="h1"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/register/employer" size="lg">
              {t("hero.employer.secondaryCta")}
            </LinkButton>
            <LinkButton href="/career-support" variant="secondary" size="lg">
              {t("expert.recruitmentHelp")}
            </LinkButton>
          </div>
        </PageContainer>
      </Section>

      <Section tone="raised">
        <PageContainer>
          <SectionHeading
            eyebrow={t("value.eyebrow")}
            title={t("value.employerTitle")}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => (
              <Card key={pillar} className="flex flex-col gap-2">
                <h2 className="type-heading-3 text-text-primary">
                  {tValue(`${pillar}.title`)}
                </h2>
                <p className="type-body-sm text-text-secondary">
                  {tValue(`${pillar}.body`)}
                </p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <SectionHeading
            eyebrow={t("journey.eyebrow")}
            title={t("journey.employerTitle")}
          />
          <Card className="mt-8">
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft text-sm font-semibold text-brand-primary-strong"
                  >
                    {n}
                  </span>
                  <span className="type-body text-text-secondary">
                    {t(`journey.employer.step${n}`)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </PageContainer>
      </Section>
    </>
  );
}
