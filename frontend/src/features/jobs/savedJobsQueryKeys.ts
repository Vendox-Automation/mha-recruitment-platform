/** TanStack Query keys for the saved-jobs feature (single source of truth). */

/** The signed-in candidate's saved-jobs list, namespaced by locale. */
export function savedJobsKey(locale: string) {
  return ["candidate", "saved-jobs", locale] as const;
}
