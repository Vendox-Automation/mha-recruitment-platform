import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { routing } from "./routing";

/**
 * Translation namespaces (spec §17.4). Each maps to a JSON file under
 * `src/messages/<locale>/<namespace>.json`. Add new namespaces here as
 * features grow; English and Simplified Chinese must stay in parity.
 */
const NAMESPACES = ["common", "home"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages: Record<string, unknown> = {};
  for (const namespace of NAMESPACES) {
    messages[namespace] = (
      await import(`../messages/${locale}/${namespace}.json`)
    ).default;
  }

  return { locale, messages };
});
