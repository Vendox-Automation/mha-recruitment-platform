/**
 * Frontend mapping of application status → localised label, plain-language
 * meaning, and a badge tone (spec §14.9). We map on the FRONTEND rather than
 * relying on the backend `status_display` so both locales stay at parity and the
 * design-system tone is consistent.
 *
 * Honesty rule (spec §14.9): REJECTED is shown neutrally — never as an
 * achievement and never with a "success" colour. The positive pipeline keeps an
 * ordered progression; REJECTED sits outside that progression.
 */

import type { BadgeTone } from "@/components/ui";

import type { ApplicationStatus } from "./types";

/** i18n key (under `candidate.applications.status`) for a status' label. */
export function statusLabelKey(status: ApplicationStatus): string {
  return `status.${status}.label`;
}

/** i18n key (under `candidate.applications.status`) for a status' meaning. */
export function statusMeaningKey(status: ApplicationStatus): string {
  return `status.${status}.meaning`;
}

/** i18n key for the candidate's suggested next action at a status. */
export function statusNextActionKey(status: ApplicationStatus): string {
  return `status.${status}.next`;
}

/**
 * Badge tone for a status. The positive pipeline brightens toward an offer;
 * HIRED is the only success tone. REJECTED is neutral (never danger-as-blame,
 * never success) so it reads honestly without alarm (spec §13.7 colour is not
 * the sole carrier — text always states the stage).
 */
const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  APPLIED: "neutral",
  UNDER_REVIEW: "info",
  SHORTLISTED: "info",
  INTERVIEW: "brand",
  OFFERED: "brand",
  HIRED: "success",
  REJECTED: "neutral",
};

export function statusTone(status: ApplicationStatus): BadgeTone {
  return STATUS_TONE[status] ?? "neutral";
}

/**
 * Ordered positive pipeline used by the dashboard snapshot (spec §14.9). The
 * journey runs APPLIED → … → HIRED. REJECTED is intentionally EXCLUDED here so
 * it is never rendered as a pipeline achievement; it is surfaced separately and
 * neutrally.
 */
export const PIPELINE_STAGES: readonly ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
] as const;

/** All seven statuses, for exhaustive iteration/typing. */
export const ALL_STATUSES: readonly ApplicationStatus[] = [
  ...PIPELINE_STAGES,
  "REJECTED",
] as const;

/** True when the status is a terminal/closed outcome (no further candidate action). */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return status === "HIRED" || status === "REJECTED";
}
