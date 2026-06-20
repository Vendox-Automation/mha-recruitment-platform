/** TanStack Query keys for the applications feature (single source of truth). */

/** The candidate's applications list. */
export const APPLICATIONS_LIST_KEY = ["applications", "list"] as const;

/** A single application detail by id. */
export function applicationDetailKey(id: string | number) {
  return ["applications", "detail", String(id)] as const;
}

/** The candidate's application for a given job (already-applied probe). */
export function jobApplicationStatusKey(slug: string) {
  return ["applications", "job-status", slug] as const;
}
