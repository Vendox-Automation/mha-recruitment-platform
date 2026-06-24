/** TanStack Query keys for homepage data (single source of truth). */

/** Featured approved organisations on the homepage, namespaced by locale. */
export function featuredCompaniesKey(locale: string) {
  return ["home", "featured-companies", locale] as const;
}
