import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { CandidateRegisterStepper } from "@/features/auth/components/CandidateRegisterStepper";

/** Candidate registration and onboarding stepper (spec §14.7). */
export default async function CandidateRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.candidateRegister");

  return (
    <Section spacing="md">
      <PageContainer width="narrow">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <div className="mt-8">
          <CandidateRegisterStepper />
        </div>
      </PageContainer>
    </Section>
  );
}
