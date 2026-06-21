"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Card, ErrorState, LinkButton, LoadingState } from "@/components/ui";

import { CANDIDATE_PROFILE_KEY } from "../queryKeys";
import { getProfile } from "../service";
import { CandidateProfileForm } from "./CandidateProfileForm";
import { ResumeSummary } from "./ResumeSummary";

/**
 * Candidate profile screen (spec §14.7). Loads the profile via GET
 * /candidate/profile/ and renders the editable form plus a READ-ONLY resume
 * summary (the resume is managed on its own page — this view only links there).
 *
 * States: loading + error (retry) are handled here; success/field errors are
 * shown inline by the form (CLAUDE.md required states).
 */
export function CandidateProfileView() {
  const t = useTranslations("candidate.profile");
  const tResume = useTranslations("candidate.resume");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const profileQuery = useQuery({
    queryKey: CANDIDATE_PROFILE_KEY,
    queryFn: () => getProfile(locale),
  });

  if (profileQuery.isLoading) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => profileQuery.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5">
        <p className="type-body-sm text-text-secondary">{t("editLead")}</p>
        <CandidateProfileForm profile={profile} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="type-heading-3 text-text-primary">{tResume("title")}</h2>
        <ResumeSummary
          hasResume={profile.has_resume}
          originalName={profile.resume_original_name || null}
          uploadedAt={profile.resume_uploaded_at}
          actions={
            <LinkButton href="/candidate/resume" variant="secondary" size="sm">
              {profile.has_resume ? tResume("manage") : tResume("upload")}
            </LinkButton>
          }
        />
      </Card>
    </div>
  );
}
