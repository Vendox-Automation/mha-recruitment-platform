"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
} from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

import { formatDate } from "../format";
import {
  closeJob,
  listMyJobs,
  publishJob,
  reopenJob,
} from "../employerService";
import {
  availableJobActions,
  jobStatusKey,
  jobStatusTone,
} from "../employerStatus";
import type { EmployerJob } from "../employerTypes";

const QUERY_KEY = ["employer", "jobs"] as const;

/** A short, locale-aware employment-type label key. */
const EMPLOYMENT_TYPE_KEYS: Record<string, string> = {
  FULL_TIME: "fullTime",
  PART_TIME: "partTime",
  CONTRACT: "contract",
  INTERNSHIP: "internship",
  TEMPORARY: "temporary",
};

/**
 * Employer jobs list (spec §14.10/§14.11). Loads the signed-in employer's own
 * jobs via TanStack Query and renders, per row: title, status badge, employment
 * type, deadline, an honest "—" application count (analytics is Phase 9), and
 * the lifecycle actions appropriate to the status (Edit always; Publish for
 * DRAFT/CLOSED; Close for PUBLISHED; Reopen for CLOSED; View).
 *
 * Covers every required state: loading skeleton rows, an empty "post your first
 * job" state, and an error state with retry. Lifecycle actions mutate then
 * invalidate the list so the row reflects the server's new status; a failed
 * action surfaces a calm inline message without losing the list.
 */
export function EmployerJobsList() {
  const t = useTranslations("employer.jobsList");
  const tStatus = useTranslations("employer.jobs.status");
  const tType = useTranslations("jobs.employmentType");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listMyJobs(locale),
  });

  const lifecycle = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string | number;
      action: "publish" | "close" | "reopen";
    }) => {
      const run =
        action === "publish"
          ? publishJob
          : action === "close"
            ? closeJob
            : reopenJob;
      return run(id, locale);
    },
    onMutate: () => setActionError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : t("actionError")),
  });

  if (isPending) {
    return (
      <Card className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((n) => (
          <div key={n} className="flex flex-col gap-2 py-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
        <span className="sr-only">{t("loading")}</span>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorState
          title={t("errorTitle")}
          description={t("errorBody")}
          action={
            <Button onClick={() => refetch()} size="sm">
              {t("retry")}
            </Button>
          }
        />
      </Card>
    );
  }

  const jobs = data?.results ?? [];

  if (jobs.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <LinkButton href="/employer/jobs/new" size="sm">
              {t("postFirstJob")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const pendingId = lifecycle.isPending
    ? lifecycle.variables?.id
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <ErrorState compact title={t("actionErrorTitle")} description={actionError} />
      ) : null}

      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr className="border-b border-border-default">
              <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                {t("columns.role")}
              </th>
              <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                {t("columns.status")}
              </th>
              <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                {t("columns.type")}
              </th>
              <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                {t("columns.deadline")}
              </th>
              <th scope="col" className="type-label px-4 py-3 text-text-secondary">
                {t("columns.applications")}
              </th>
              <th scope="col" className="type-label px-4 py-3 text-right text-text-secondary">
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <JobRow
                key={String(job.id)}
                job={job}
                disabled={lifecycle.isPending}
                rowBusy={pendingId === job.id}
                locale={locale}
                typeLabel={(code) => {
                  const key = EMPLOYMENT_TYPE_KEYS[code];
                  return key ? tType(key) : code;
                }}
                statusLabel={(status) => tStatus(jobStatusKey(status))}
                actionLabels={{
                  view: t("actions.view"),
                  edit: t("actions.edit"),
                  publish: t("actions.publish"),
                  close: t("actions.close"),
                  reopen: t("actions.reopen"),
                }}
                onAction={(action) => {
                  if (action === "edit") {
                    router.push(`/employer/jobs/${job.id}/edit`);
                  } else if (action === "view") {
                    router.push(`/employer/jobs/${job.id}`);
                  } else {
                    lifecycle.mutate({ id: job.id, action });
                  }
                }}
              />
            ))}
          </tbody>
        </table>
      </Card>

      {isRefetching ? (
        <p className="type-caption" role="status">
          {t("refreshing")}
        </p>
      ) : null}
    </div>
  );
}

interface JobRowProps {
  job: EmployerJob;
  disabled: boolean;
  rowBusy: boolean;
  locale: string;
  typeLabel: (code: string) => string;
  statusLabel: (status: EmployerJob["status"]) => string;
  actionLabels: {
    view: string;
    edit: string;
    publish: string;
    close: string;
    reopen: string;
  };
  onAction: (action: "view" | "edit" | "publish" | "close" | "reopen") => void;
}

function JobRow({
  job,
  disabled,
  rowBusy,
  locale,
  typeLabel,
  statusLabel,
  actionLabels,
  onAction,
}: JobRowProps) {
  const actions = availableJobActions(job.status);
  const deadline = formatDate(job.application_deadline, locale);

  return (
    <tr className="border-b border-border-subtle last:border-0 align-top">
      <th scope="row" className="px-4 py-3 font-normal">
        <span className="type-body-sm font-semibold text-text-primary">
          {job.title}
        </span>
        {job.location ? (
          <span className="type-caption block">{job.location}</span>
        ) : null}
      </th>
      <td className="px-4 py-3">
        <Badge tone={jobStatusTone(job.status)} withDot>
          {statusLabel(job.status)}
        </Badge>
      </td>
      <td className="px-4 py-3 type-body-sm text-text-secondary">
        {typeLabel(job.employment_type)}
      </td>
      <td className="px-4 py-3 type-body-sm text-text-secondary">
        {deadline ?? "—"}
      </td>
      <td className="px-4 py-3 type-body-sm text-text-secondary">—</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onAction("view")}
          >
            {actionLabels.view}
          </Button>
          {actions.includes("edit") ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onAction("edit")}
            >
              {actionLabels.edit}
            </Button>
          ) : null}
          {actions.includes("publish") ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onAction("publish")}
            >
              {rowBusy ? "…" : actionLabels.publish}
            </Button>
          ) : null}
          {actions.includes("reopen") ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onAction("reopen")}
            >
              {rowBusy ? "…" : actionLabels.reopen}
            </Button>
          ) : null}
          {actions.includes("close") ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onAction("close")}
            >
              {rowBusy ? "…" : actionLabels.close}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
