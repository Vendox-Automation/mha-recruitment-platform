import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Card } from "@/components/ui";
import { EmployerRegisterForm } from "@/features/auth/components/EmployerRegisterForm";

/** Employer registration shell (spec §14.8). */
export default async function EmployerRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.employerRegister");

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <EmployerRegisterForm />
          <Card tone="subtle" className="flex flex-col gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {t("approval.title")}
            </h2>
            <ol className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft text-sm font-semibold text-brand-primary-strong"
                  >
                    {n}
                  </span>
                  <span className="type-body-sm text-text-secondary">
                    {t(`approval.step${n}`)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </PageContainer>
    </Section>
  );
}
