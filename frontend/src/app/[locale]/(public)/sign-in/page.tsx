import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";
import { SignInForm } from "@/features/auth/components/SignInForm";

/**
 * Sign-in + account selection (spec §14.6). Two equal routes (candidate /
 * employer) are presented alongside one shared sign-in form.
 */
export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.accountSelect");

  return (
    <Section spacing="md">
      <PageContainer width="wide">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Account-selection routes */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="flex flex-col gap-3">
              <h2 className="type-heading-3 text-text-primary">
                {t("candidate.title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("candidate.body")}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <LinkButton href="/register/candidate" size="sm">
                  {t("candidate.register")}
                </LinkButton>
              </div>
            </Card>
            <Card className="flex flex-col gap-3">
              <h2 className="type-heading-3 text-text-primary">
                {t("employer.title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("employer.body")}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <LinkButton
                  href="/register/employer"
                  variant="secondary"
                  size="sm"
                >
                  {t("employer.register")}
                </LinkButton>
              </div>
            </Card>
          </div>

          <SignInForm />
        </div>
      </PageContainer>
    </Section>
  );
}
