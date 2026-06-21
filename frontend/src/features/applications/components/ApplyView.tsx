"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import {
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  PermissionDeniedState,
  Skeleton,
} from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { getJob } from "@/features/jobs/service";
import { getProfile } from "@/features/candidates/service";
import { CANDIDATE_PROFILE_KEY } from "@/features/candidates/queryKeys";

import { jobApplicationStatusKey } from "../queryKeys";
import { getJobApplicationStatus } from "../service";
import { ApplyForm } from "./ApplyForm";

/**
 * Apply route body (spec §10.1, §14.3). Client component: it gates by session,
 * loads the public job (for title + screening questions), checks whether the
 * candidate has already applied (→ View Application, no duplicate per §14.3),
 * and otherwise renders {@link ApplyForm}. Anonymous → sign in; non-candidate
 * roles cannot apply.
 */
export function ApplyView({ slug }: { slug: string }) {
  const t = useTranslations("candidate.applications.apply");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();

  // Anonymous users are sent to sign in (Django is authoritative regardless).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  const isCandidate = role === "CANDIDATE";

  const jobQuery = useQuery({
    queryKey: ["job", slug, locale],
    queryFn: () => getJob(slug, locale),
    enabled: isCandidate,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if ((error as { status?: number })?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const statusQuery = useQuery({
    queryKey: jobApplicationStatusKey(slug),
    queryFn: () => getJobApplicationStatus(slug, locale),
    enabled: isCandidate,
  });

  const profileQuery = useQuery({
    queryKey: CANDIDATE_PROFILE_KEY,
    queryFn: () => getProfile(locale),
    enabled: isCandidate,
  });

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  // Authenticated but not a candidate — they cannot apply to roles.
  if (!isCandidate) {
    return (
      <Card>
        <PermissionDeniedState
          title={tCommon("permissionTitle")}
          description={t("notCandidate")}
          action={
            <LinkButton href="/jobs" variant="secondary">
              {t("browseRoles")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  if (jobQuery.isLoading || statusQuery.isLoading || profileQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-1/2" />
        <LoadingState
          title={tCommon("loadingTitle")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </div>
    );
  }

  if (jobQuery.isError) {
    const status = (jobQuery.error as { status?: number })?.status;
    return (
      <Card>
        <ErrorState
          title={status === 404 ? t("jobUnavailable") : tCommon("errorTitle")}
          description={
            status === 404 ? t("jobUnavailableBody") : tCommon("errorDescription")
          }
          action={
            <LinkButton href="/jobs" variant="secondary">
              {t("browseRoles")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const job = jobQuery.data;
  if (!job) return null;

  // Already applied → no duplicate; route to the existing application (§14.3).
  const existing = statusQuery.data ?? null;
  if (existing) {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="type-heading-3 text-text-primary">
          {t("alreadyAppliedTitle")}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {t("alreadyAppliedBody", { job: job.title })}
        </p>
        <div>
          <LinkButton href={`/candidate/applications/${existing.id}`}>
            {t("viewApplication")}
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/jobs/${slug}`}
        className="type-body-sm text-text-secondary no-underline hover:text-text-primary"
      >
        ← {t("backToRole")}
      </Link>
      <Card>
        <ApplyForm
          slug={slug}
          jobTitle={job.title}
          companyName={job.company?.company_name ?? null}
          questions={job.screening_questions.map((q) => ({
            id: q.id,
            question: q.question,
            question_type: q.question_type,
            is_required: q.is_required,
            options_json: q.options_json,
          }))}
          hasResume={profileQuery.data?.has_resume ?? false}
        />
      </Card>
    </div>
  );
}
