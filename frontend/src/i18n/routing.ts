import { defineRouting } from "next-intl/routing";

/**
 * Locale routing configuration (spec §9.2, §17.2).
 *
 * Locales are URL-prefixed and always present (`/en/...`, `/zh-CN/...`) so the
 * active language is explicit and shareable.
 */
export const routing = defineRouting({
  locales: ["en", "zh-CN"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Maps an app locale to the correct HTML `lang` attribute value. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  "zh-CN": "zh-Hans",
};
