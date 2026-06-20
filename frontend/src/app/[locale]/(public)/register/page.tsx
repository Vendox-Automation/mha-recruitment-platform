import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section, SectionHeading } from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Account creation chooser (spec §9.2 /register). */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.register");

  return (
    <Section spacing="md">
      <PageContainer width="narrow">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          lead={t("lead")}
          as="h1"
        />
        <div className="mt-8 grid gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {t("candidate.title")}
            </h2>
            <p className="type-body-sm text-text-secondary">
              {t("candidate.body")}
            </p>
            <div className="mt-1">
              <LinkButton href="/register/candidate">
                {t("candidate.cta")}
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
            <div className="mt-1">
              <LinkButton href="/register/employer" variant="secondary">
                {t("employer.cta")}
              </LinkButton>
            </div>
          </Card>
        </div>
        <p className="mt-6 type-body-sm text-text-secondary">
          {t("haveAccount")}{" "}
          <Link
            href="/sign-in"
            className="text-brand-primary no-underline hover:underline"
          >
            {t("signIn")}
          </Link>
        </p>
      </PageContainer>
    </Section>
  );
}
