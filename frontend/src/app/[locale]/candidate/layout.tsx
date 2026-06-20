import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardShell, type DashboardNavItem } from "@/components/layout";
import { SkipToContent } from "@/components/ui";

/**
 * Candidate area chrome (spec §14.9, §11.7). Calm dashboard layout with sidebar
 * / topbar. Visibly distinct from the employer area via eyebrow + accent rail
 * while staying one brand (spec §9.1, §5.2).
 *
 * PROTECTED AREA: no auth wiring this phase. Route guards that require an
 * authenticated CANDIDATE session are added in Phase 2 (ADR-0001 §4).
 */
const NAV: Omit<DashboardNavItem, "label">[] = [
  { key: "dashboard", href: "/candidate/dashboard" },
  { key: "profile", href: "/candidate/profile" },
  { key: "resume", href: "/candidate/resume" },
  { key: "applications", href: "/candidate/applications" },
  { key: "savedJobs", href: "/candidate/saved-jobs" },
  { key: "support", href: "/candidate/support" },
  { key: "settings", href: "/candidate/settings" },
];

export default async function CandidateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("candidate");
  const tCommon = await getTranslations("common");

  const nav = NAV.map((item) => ({ ...item, label: t(`nav.${item.key}`) }));

  return (
    <>
      <SkipToContent label={tCommon("skipToContent")} />
      <DashboardShell
        accent="candidate"
        brand={tCommon("brand")}
        homeLabel={tCommon("nav.home")}
        signOutLabel={tCommon("nav.signOut")}
        eyebrow={t("area.eyebrow")}
        areaLabel={t("area.label")}
        nav={nav}
      >
        {children}
      </DashboardShell>
    </>
  );
}
