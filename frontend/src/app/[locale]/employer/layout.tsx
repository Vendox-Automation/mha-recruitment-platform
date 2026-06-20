import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardShell, type DashboardNavItem } from "@/components/layout";
import { SkipToContent } from "@/components/ui";
import { RouteGuard } from "@/lib/auth";

/**
 * Employer area chrome (spec §14.10–14.12, §11.7). Calm recruitment workspace
 * with sidebar / topbar. Visibly distinct from the candidate area via eyebrow +
 * accent rail while staying one brand (spec §9.1, §5.2).
 *
 * PROTECTED AREA (ADR-0001 §4.1, spec §8.3): the layout {@link RouteGuard}
 * requires an authenticated EMPLOYER (any approval status, so the pending
 * screen is reachable). Approval gating for workspace routes lives on those
 * pages via `EmployerWorkspaceGuard`. Guards are UX only — Django is
 * authoritative (spec §10).
 */
const NAV: Omit<DashboardNavItem, "label">[] = [
  { key: "dashboard", href: "/employer/dashboard" },
  { key: "pending", href: "/employer/pending" },
  { key: "companyProfile", href: "/employer/company-profile" },
  { key: "jobs", href: "/employer/jobs" },
  { key: "analytics", href: "/employer/analytics" },
  { key: "settings", href: "/employer/settings" },
];

export default async function EmployerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employer");
  const tCommon = await getTranslations("common");

  const nav = NAV.map((item) => ({ ...item, label: t(`nav.${item.key}`) }));

  return (
    <>
      <SkipToContent label={tCommon("skipToContent")} />
      <DashboardShell
        accent="employer"
        brand={tCommon("brand")}
        homeLabel={tCommon("nav.home")}
        signOutLabel={tCommon("nav.signOut")}
        eyebrow={t("area.eyebrow")}
        areaLabel={t("area.label")}
        nav={nav}
      >
        <RouteGuard requireRole="EMPLOYER">{children}</RouteGuard>
      </DashboardShell>
    </>
  );
}
