/** TanStack Query keys for the Smart Job Fit feature (single source of truth). */
export const jobFitKey = (slug: string, locale: string) =>
  ["job-fit", slug, locale] as const;
