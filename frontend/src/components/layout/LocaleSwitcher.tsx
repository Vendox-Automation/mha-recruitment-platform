"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/**
 * Locale switcher (spec §17.2 / §9.1). Switches language on the SAME path using
 * the next-intl router so route + query state are preserved. Stores nothing in
 * localStorage — next-intl persists the choice via its cookie. Rendered as a
 * small segmented control that is fully keyboard operable.
 */
export function LocaleSwitcher({
  tone = "default",
}: {
  tone?: "default" | "inverse";
}) {
  const t = useTranslations("common.language");
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    if (next === activeLocale) return;
    // Preserve the full query string (filters, sort, page) across the switch so
    // e.g. /en/jobs?keyword=…&sort=relevant survives going to 中文 (L-B3). Read
    // it from the live URL inside the (client-only) click handler rather than
    // via useSearchParams(), so the header does not force a static-render
    // Suspense bailout on every page that uses it.
    const query =
      typeof window !== "undefined"
        ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
        : {};
    startTransition(() => {
      // Preserve the current route, dynamic params, AND query; only the locale
      // changes.
      router.replace(
        // @ts-expect-error -- pathname is a typed route; params satisfy it.
        { pathname, params, query },
        { locale: next },
      );
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border p-0.5",
        tone === "inverse"
          ? "border-text-inverse/30"
          : "border-border-default",
      )}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-current={isActive ? "true" : undefined}
            disabled={isPending}
            onClick={() => selectLocale(locale)}
            className={cn(
              "rounded-[0.3rem] px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring disabled:opacity-60",
              isActive
                ? "bg-brand-primary text-brand-on-primary"
                : tone === "inverse"
                  ? "text-text-inverse/80 hover:bg-text-inverse/10"
                  : "text-text-secondary hover:bg-surface-subtle",
            )}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}
