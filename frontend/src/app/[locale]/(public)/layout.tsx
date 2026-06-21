import { getTranslations, setRequestLocale } from "next-intl/server";

import { PublicFooter, PublicHeader } from "@/components/layout";
import { SkipToContent } from "@/components/ui";

/**
 * Public chrome (spec §14.1): header + main + footer. All public pages render
 * inside this group so navigation, branding, and the locale switcher are
 * consistent (spec §5.2 "one brand"). The skip link targets `#main-content`.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <>
      <SkipToContent label={t("skipToContent")} />
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
