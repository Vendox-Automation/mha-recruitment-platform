/**
 * Employer job-status presentation + lifecycle-action logic (spec §14.11).
 *
 * Pure, UI-free helpers shared by the jobs list and the job detail screen so the
 * status→badge-tone and status→available-actions mappings live in ONE place and
 * are unit-testable. Django remains authoritative — these only decide what the
 * employer is OFFERED; the server re-validates every transition (e.g. publish is
 * refused when the deadline has passed) and the screens surface that error.
 */

import type { BadgeTone } from "@/components/ui";

import type { JobStatus } from "./employerTypes";

/** Lifecycle actions an employer can trigger from the UI. */
export type JobLifecycleAction = "edit" | "publish" | "close" | "reopen";

/** i18n status key (under `employer.jobs.status`) for a backend status code. */
const STATUS_KEYS: Record<JobStatus, string> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
  SUSPENDED: "suspended",
  EXPIRED: "expired",
  ARCHIVED: "archived",
};

/** Resolve the `employer.jobs.status.*` i18n key for a status code. */
export function jobStatusKey(status: JobStatus): string {
  return STATUS_KEYS[status] ?? "draft";
}

/** Badge tone for a status — meaning is always also carried by the text. */
const STATUS_TONES: Record<JobStatus, BadgeTone> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  CLOSED: "warning",
  SUSPENDED: "danger",
  EXPIRED: "warning",
  ARCHIVED: "neutral",
};

/** Resolve the {@link BadgeTone} for a status code. */
export function jobStatusTone(status: JobStatus): BadgeTone {
  return STATUS_TONES[status] ?? "neutral";
}

/**
 * The lifecycle actions available for a given status, matching the backend
 * transitions:
 *   - DRAFT     → Edit, Publish
 *   - PUBLISHED → Edit, Close
 *   - CLOSED    → Edit, Publish (reopen), Reopen
 *   - SUSPENDED → (none — admin-locked; the edit form is read-only)
 *   - EXPIRED / ARCHIVED → Edit only (employer may revise; server gates publish)
 *
 * CLOSED offers both Publish and Reopen because the backend accepts either path
 * (publish: CLOSED→PUBLISHED; reopen: CLOSED→PUBLISHED). Reopen is the primary,
 * clearer affordance; callers may show just one.
 */
export function availableJobActions(status: JobStatus): JobLifecycleAction[] {
  switch (status) {
    case "DRAFT":
      return ["edit", "publish"];
    case "PUBLISHED":
      return ["edit", "close"];
    case "CLOSED":
      return ["edit", "reopen"];
    case "EXPIRED":
    case "ARCHIVED":
      return ["edit"];
    case "SUSPENDED":
      return [];
    default:
      return ["edit"];
  }
}

/** Whether the job is admin-locked and must render read-only (no edits). */
export function isJobAdminLocked(status: JobStatus): boolean {
  return status === "SUSPENDED";
}
