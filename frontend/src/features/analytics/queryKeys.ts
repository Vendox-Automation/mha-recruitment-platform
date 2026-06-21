/** TanStack Query keys for the analytics feature (single source of truth). */

/** The signed-in employer's own-job analytics, namespaced by locale. */
export function employerAnalyticsKey(locale: string) {
  return ["employer", "analytics", locale] as const;
}

/** Public career-intelligence insights (homepage console), namespaced by locale. */
export function publicInsightsKey(locale: string) {
  return ["insights", "public", locale] as const;
}
