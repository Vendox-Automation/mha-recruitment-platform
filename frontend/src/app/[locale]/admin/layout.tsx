import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardShell, type DashboardNavItem } from "@/components/layout";
import { SkipToContent } from "@/components/ui";
import { RouteGuard } from "@/lib/auth";

/**
 * Admin area chrome (product-owner-approved admin scope). Calm dashboard layout
 * mirroring the candidate/employer areas, distinguished by its own eyebrow +
 * accent rail while staying one brand (spec §9.1, §5.2).
 *
 * PROTECTED AREA (ADR-0001 §4.1): {@link RouteGuard} requires an authenticated
 * ADMIN session; anonymous users go to /sign-in and other roles to their own
 * area. Guards are UX only — Django remains authoritative (spec §10).
 */
const NAV: Omit<DashboardNavItem, "label">[] = [
  { key: "dashboard", href: "/admin/dashboard" },
  { key: "employers", href: "/admin/employers" },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tCommon = await getTranslations("common");

  const nav = NAV.map((item) => ({ ...item, label: t(`nav.${item.key}`) }));

  return (
    <>
      <SkipToContent label={tCommon("skipToContent")} />
      <DashboardShell
        accent="admin"
        brand={tCommon("brand")}
        homeLabel={tCommon("nav.home")}
        signOutLabel={tCommon("nav.signOut")}
        eyebrow={t("area.eyebrow")}
        areaLabel={t("area.label")}
        nav={nav}
      >
        <RouteGuard requireRole="ADMIN">{children}</RouteGuard>
      </DashboardShell>
    </>
  );
}
