import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer, Section } from "@/components/layout";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  VisuallyHidden,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Company detail shell (spec §14.4). Static structure; no public reviews. */
export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("companies.detail");
  const tCommon = await getTranslations("common");
  const tBadge = await getTranslations("common.badge");

  return (
    <Section spacing="md">
      <PageContainer>
        <Link
          href="/companies"
          className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
        >
          ← {t("backToDirectory")}
        </Link>

        <Alert tone="info" className="mt-4">
          {tCommon("states.shellNotice")}
        </Alert>

        <header className="mt-6 flex items-center gap-4">
          <Skeleton className="h-16 w-16" />
          <div className="flex flex-col gap-2">
            <h1 className="type-heading-1 text-text-primary">
              <VisuallyHidden>{t("heading")}</VisuallyHidden>
              <Skeleton className="h-6 w-48" />
            </h1>
            <Badge tone="approved" withDot>
              {tBadge("approvedEmployer")}
            </Badge>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-3">
              <h2 className="type-heading-2 text-text-primary">{t("about")}</h2>
              <EmptyState
                compact
                title={tCommon("states.emptyTitle")}
                description={tCommon("states.emptyDescription")}
              />
            </Card>
          </div>
          <Card className="flex flex-col gap-3">
            <h2 className="type-heading-3 text-text-primary">
              {t("activeJobs")}
            </h2>
            <EmptyState
              compact
              title={t("noActiveJobs")}
              description={tCommon("states.emptyDescription")}
            />
          </Card>
        </div>
      </PageContainer>
    </Section>
  );
}
