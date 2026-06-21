/** TanStack Query keys for homepage data (single source of truth). */

/** Latest published roles shown on the homepage, namespaced by locale. */
export function latestJobsKey(locale: string) {
  return ["home", "latest-jobs", locale] as const;
}

/** Featured approved organisations on the homepage, namespaced by locale. */
export function featuredCompaniesKey(locale: string) {
  return ["home", "featured-companies", locale] as const;
}
