"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  Alert,
  Button,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  SuccessState,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";

import { getMyJob } from "../employerService";
import { isJobAdminLocked } from "../employerStatus";
import { JobForm } from "./JobForm";

/**
 * Edit-mode wrapper around {@link JobForm} (spec §14.11). Fetches the owner job
 * by id (prefilling the form), and handles loading / not-found / permission /
 * error states. When the job is admin-SUSPENDED it renders the moderation
 * reason and a read-only notice INSTEAD of an editable form — the backend
 * rejects edits to suspended jobs, so offering the form would be dishonest.
 */
export function EmployerJobEdit({ id }: { id: string }) {
  const t = useTranslations("employer.jobEditView");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: job, isPending, isError, error, refetch } = useQuery({
    queryKey: ["employer", "job", id],
    queryFn: () => getMyJob(id, locale),
  });

  if (isPending) {
    return <LoadingState title={t("loading")} spinnerLabel={t("loading")} />;
  }

  if (isError) {
    const notFound =
      error instanceof ApiRequestError &&
      (error.status === 404 || error.status === 403);
    return (
      <Card>
        <ErrorState
          title={notFound ? t("notFoundTitle") : t("errorTitle")}
          description={notFound ? t("notFoundBody") : t("errorBody")}
          action={
            notFound ? (
              <LinkButton href="/employer/jobs" size="sm">
                {t("backToJobs")}
              </LinkButton>
            ) : (
              <Button size="sm" onClick={() => refetch()}>
                {t("retry")}
              </Button>
            )
          }
        />
      </Card>
    );
  }

  if (isJobAdminLocked(job.status)) {
    return (
      <Card className="flex flex-col gap-4">
        <Alert tone="warning">{t("suspendedNotice")}</Alert>
        {job.moderation_reason ? (
          <div className="flex flex-col gap-1">
            <span className="type-label text-text-secondary">
              {t("moderationReason")}
            </span>
            <p className="type-body-sm text-text-primary">
              {job.moderation_reason}
            </p>
          </div>
        ) : null}
        <div>
          <LinkButton href={`/employer/jobs/${id}`} variant="secondary" size="sm">
            {t("backToDetail")}
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      {saved ? (
        <SuccessState compact title={t("savedTitle")} description={t("savedBody")} />
      ) : null}
      <JobForm
        job={job}
        onSaved={(updated) => {
          queryClient.setQueryData(["employer", "job", id], updated);
          queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
          setSaved(true);
        }}
      />
    </Card>
  );
}
