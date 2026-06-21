"use client";

import { useTranslations } from "next-intl";

import { Button, LinkButton } from "@/components/ui";
import { useAuth } from "@/lib/auth";

import { useSavedJob } from "../useSavedJob";

/**
 * Save / un-save toggle for a public job (spec §15.5).
 *
 * Viewer-role behaviour:
 *  - Anonymous → a "Sign in to save" link to `/sign-in` (no fetch, no toggle).
 *  - Candidate → a real toggle: "Save Job" ↔ "Saved", optimistic with rollback.
 *  - Employer / admin → nothing rendered (saving roles is candidate-only).
 *
 * The button keeps `aria-pressed` in sync with the saved state so assistive tech
 * announces the toggle, and exposes an `sr-only` live message when a save/un-save
 * fails and is rolled back.
 */
export function SaveJobButton({
  slug,
  jobId,
  fullWidth = false,
}: {
  slug: string;
  /** The job's UUID, when known — required for un-save. */
  jobId?: string;
  fullWidth?: boolean;
}) {
  const t = useTranslations("jobs.detail.save");
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();
  const isCandidate = isAuthenticated && role === "CANDIDATE";

  const { isSaved, isMutating, isError, canUnsave, toggle } = useSavedJob({
    slug,
    jobId,
  });

  // Employer / admin (or any signed-in non-candidate) → not shown.
  if (isAuthenticated && !isCandidate) {
    return null;
  }

  // Anonymous → prompt to sign in (no save state to manage).
  if (!isAuthenticated) {
    return (
      <LinkButton
        href="/sign-in"
        variant="secondary"
        fullWidth={fullWidth}
        // Keep the affordance honest while the session resolves.
        aria-disabled={authLoading ? "true" : undefined}
      >
        {t("signInToSave")}
      </LinkButton>
    );
  }

  // A saved job we cannot un-save (job id unknown) stays honestly disabled
  // rather than firing a request the backend cannot key.
  const disabled = isMutating || (isSaved && !canUnsave);

  return (
    <>
      <Button
        type="button"
        variant={isSaved ? "primary" : "secondary"}
        fullWidth={fullWidth}
        aria-pressed={isSaved}
        disabled={disabled}
        onClick={toggle}
      >
        {isSaved ? t("saved") : t("save")}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {isError ? t("error") : ""}
      </span>
    </>
  );
}
