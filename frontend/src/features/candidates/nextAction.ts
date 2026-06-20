/**
 * Dashboard "next action" selection (spec §14.9 A — welcome + a single clear
 * next step). Pure + deterministic so it is unit-testable and so the same
 * priority drives copy in both locales.
 *
 * Priority (highest first):
 *   1. completeProfile — the basic profile is incomplete (missing required
 *      identity fields). Without it, matching and applying are weak.
 *   2. uploadResume — profile basics are in place but no resume is on file;
 *      a resume is required to apply (spec §22.2).
 *   3. browseJobs — profile + resume are ready; the candidate is set up, so the
 *      next step is to go find roles.
 *
 * We treat the resume as the dividing line between "set up your account" and
 * "go apply"; profile-completeness is judged by the required basic fields only,
 * not the resume (the resume has its own dedicated step).
 */

import type { CandidateDashboard } from "./types";

export type CandidateNextAction =
  | "completeProfile"
  | "uploadResume"
  | "browseJobs";

/** Required basic-profile fields (mirrors the serializer's required set). */
const REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "phone",
  "preferred_job_title",
] as const;

/**
 * Choose the candidate's next action from a dashboard snapshot. `missing` is
 * the completion breakdown's list of incomplete field keys; if any REQUIRED
 * basic field is missing, profile completion wins. Otherwise the resume gates
 * the jump to browsing.
 */
export function selectNextAction(
  dashboard: Pick<CandidateDashboard, "profile_completion" | "resume">,
): CandidateNextAction {
  const missing = new Set(dashboard.profile_completion.missing);
  const basicsIncomplete = REQUIRED_PROFILE_FIELDS.some((field) =>
    missing.has(field),
  );
  if (basicsIncomplete) return "completeProfile";
  if (!dashboard.resume.has_resume) return "uploadResume";
  return "browseJobs";
}

/** Route + i18n suffix for each next action (used by the dashboard view). */
export const NEXT_ACTION_ROUTE: Record<CandidateNextAction, string> = {
  completeProfile: "/candidate/profile",
  uploadResume: "/candidate/resume",
  browseJobs: "/jobs",
};
