/** TanStack Query keys for the support feature (single source of truth). */

/** The signed-in candidate's own support-request history, by locale. */
export function supportRequestsKey(locale: string) {
  return ["candidate", "support-requests", locale] as const;
}
