import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { PasswordResetRequestForm } from "@/features/auth/components/PasswordResetRequestForm";

/** Password-reset request (spec §14.6). Confirm step is deferred — see report. */
export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.passwordReset");

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
          <PasswordResetRequestForm />
        </div>
      </PageContainer>
    </Section>
  );
}
