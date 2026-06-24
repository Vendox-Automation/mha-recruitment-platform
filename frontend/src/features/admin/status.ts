/**
 * Employer-approval status presentation + transition rules for the admin queue.
 *
 * The allowed transitions mirror the backend lifecycle (spec §8.3): a reviewer
 * approves or rejects a pending registration, can re-approve a previously
 * rejected one, suspends an approved employer, and restores a suspended one.
 * These rules drive which per-row actions render; Django remains authoritative
 * and rejects any illegal transition with a surfaced error.
 */

import type { BadgeTone } from "@/components/ui";

import type { AdminEmployerStatus, AdminEmployerStatusFilter } from "./types";

/** All concrete statuses (no "ALL" pseudo-value). */
export const ALL_EMPLOYER_STATUSES: readonly AdminEmployerStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

/** Filter options offered by the queue, "All" first. */
export const STATUS_FILTERS: readonly AdminEmployerStatusFilter[] = [
  "ALL",
  ...ALL_EMPLOYER_STATUSES,
] as const;

/** The actions a reviewer can take, surfaced as per-row buttons. */
export type AdminEmployerAction =
  | "approve"
  | "reject"
  | "suspend"
  | "restore";

/**
 * Badge tone per status. PENDING is the attention-worthy state (warning),
 * APPROVED is positive, SUSPENDED is danger, and REJECTED stays neutral — a
 * rejection is an outcome, not an error to blame anyone for (spec §13.7).
 */
export function statusTone(status: AdminEmployerStatus): BadgeTone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "SUSPENDED":
      return "danger";
    case "REJECTED":
    default:
      return "neutral";
  }
}

/** i18n key (under `admin.status`) for a status label. */
export function statusLabelKey(status: AdminEmployerStatus): string {
  return `status.${status}`;
}

/**
 * The actions available for a row in a given status. Approve is offered for
 * PENDING and REJECTED; Reject only for PENDING; Suspend only for APPROVED;
 * Restore only for SUSPENDED.
 */
export function actionsForStatus(
  status: AdminEmployerStatus,
): readonly AdminEmployerAction[] {
  switch (status) {
    case "PENDING":
      return ["approve", "reject"];
    case "REJECTED":
      return ["approve"];
    case "APPROVED":
      return ["suspend"];
    case "SUSPENDED":
      return ["restore"];
    default:
      return [];
  }
}
