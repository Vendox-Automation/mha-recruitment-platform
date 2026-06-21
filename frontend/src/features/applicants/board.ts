/**
 * Pure helpers for the employer applicant workspace (spec §14.12). Kept separate
 * from React so the column grouping, status labelling, and "needs rejection
 * confirmation" rule can be unit-tested in isolation.
 *
 * The seven Kanban columns map 1:1 to the seven application statuses. We keep
 * the SAME ordered set the backend uses (APPLIED … HIRED, then REJECTED) so the
 * board reads as a left-to-right pipeline with the terminal REJECTED column at
 * the end (spec §14.12; honesty rule §14.9 — REJECTED is never coloured as
 * success and sits outside the positive progression).
 */

import { ALL_STATUSES } from "@/features/applications/status";

import type { ApplicationStatus, EmployerApplicantListItem } from "./types";

/** The Kanban columns, in pipeline order, terminal REJECTED last. */
export const KANBAN_COLUMNS: readonly ApplicationStatus[] = ALL_STATUSES;

/** i18n key (under `employer.applicants.status`) for a status' label. */
export function statusLabelKey(status: ApplicationStatus): string {
  return `status.${status}.label`;
}

/**
 * Group a flat applicant list into one bucket per status, preserving the
 * incoming order within each bucket (the list arrives newest-first from the
 * API). Every status key is always present, even when empty, so the board
 * renders all seven columns with honest empty states.
 */
export function groupByStatus(
  items: readonly EmployerApplicantListItem[],
): Record<ApplicationStatus, EmployerApplicantListItem[]> {
  const grouped = Object.fromEntries(
    KANBAN_COLUMNS.map((status) => [status, [] as EmployerApplicantListItem[]]),
  ) as Record<ApplicationStatus, EmployerApplicantListItem[]>;

  for (const item of items) {
    // Defensive: an unknown status would otherwise be dropped silently.
    (grouped[item.status] ?? grouped.APPLIED).push(item);
  }
  return grouped;
}

/**
 * Whether moving an applicant TO this status must be confirmed first. REJECTED
 * is a consequential, candidate-visible outcome, so the workspace asks for an
 * explicit confirmation before committing the change (spec §14.12).
 */
export function needsConfirmation(target: ApplicationStatus): boolean {
  return target === "REJECTED";
}
