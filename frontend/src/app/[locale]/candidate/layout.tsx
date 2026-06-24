import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardShell, type DashboardNavItem } from "@/components/layout";
import { SkipToContent } from "@/components/ui";
import { RouteGuard } from "@/lib/auth";

/**
 * Candidate area chrome (spec §14.9, §11.7). Calm dashboard layout with sidebar
 * / topbar. Visibly distinct from the employer area via eyebrow + accent rail
 * while staying one brand (spec §9.1, §5.2).
 *
 * PROTECTED AREA (ADR-0001 §4.1): {@link RouteGuard} requires an authenticated
 * CANDIDATE session; anonymous users are sent to /sign-in and other roles to
 * their own area. Guards are UX only — Django remains authoritative (spec §10).
 */
const NAV: Omit<DashboardNavItem, "label">[] = [
  { key: "dashboard", href: "/candidate/dashboard" },
  { key: "browseJobs", href: "/jobs" },
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
        <RouteGuard requireRole="CANDIDATE">{children}</RouteGuard>
      </DashboardShell>
    </>
  );
}
