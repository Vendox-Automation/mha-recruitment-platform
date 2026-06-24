/** TanStack Query keys for the admin feature (single source of truth). */

import type { AdminEmployerListParams } from "./types";

/** Root key — invalidating this refreshes every admin query. */
export const ADMIN_ROOT_KEY = ["admin"] as const;

/** The approval-count summary shown on the admin dashboard. */
export const ADMIN_SUMMARY_KEY = ["admin", "summary"] as const;

/** The employer queue, scoped by its current filter / search / page. */
export function adminEmployersListKey(params: AdminEmployerListParams = {}) {
  return [
    "admin",
    "employers",
    "list",
    {
      status: params.status ?? "ALL",
      search: params.search ?? "",
      page: params.page ?? 1,
    },
  ] as const;
}

/** A single employer's review detail by id. */
export function adminEmployerDetailKey(id: string | number) {
  return ["admin", "employers", "detail", String(id)] as const;
}
