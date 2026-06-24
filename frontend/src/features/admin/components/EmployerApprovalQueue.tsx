"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";

import { formatDate } from "../format";
import { adminEmployersListKey } from "../queryKeys";
import { getAdminEmployers } from "../service";
import {
  actionsForStatus,
  STATUS_FILTERS,
  statusLabelKey,
  statusTone,
  type AdminEmployerAction,
} from "../status";
import type {
  AdminEmployerListItem,
  AdminEmployerStatusFilter,
} from "../types";
import { useDebouncedValue } from "../useDebouncedValue";
import { useEmployerAction, type EmployerActionVars } from "../useEmployerAction";
import { RejectEmployerDialog } from "./RejectEmployerDialog";

interface Feedback {
  tone: "success" | "danger";
  message: string;
}

/**
 * Employer approval queue (admin scope). A status filter + search box drive a
 * paginated list of employer registrations; each row offers the actions allowed
 * by its current status (approve / reject / suspend / restore). Reject opens an
 * accessible dialog requiring a reason. Owns the loading (skeletons), empty
 * (honest "no employers match"), error/retry, and per-action success/error
 * states; action buttons disable while a mutation is in flight.
 *
 * Every action invalidates the list + summary on success so the queue and the
 * dashboard reconcile with the server (the authoritative lifecycle).
 */
export function EmployerApprovalQueue() {
  const t = useTranslations("admin.queue");
  const tStatus = useTranslations("admin");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const [status, setStatus] = useState<AdminEmployerStatusFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [rejectTarget, setRejectTarget] =
    useState<AdminEmployerListItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  // The id + action currently mutating, so only that row's buttons show busy.
  const [pendingAction, setPendingAction] = useState<EmployerActionVars | null>(
    null,
  );

  const params = { status, search, page };
  const query = useQuery({
    queryKey: adminEmployersListKey(params),
    queryFn: () => getAdminEmployers(params, locale),
    placeholderData: keepPreviousData,
  });

  function resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
      const fieldReason = error.fields?.reason?.[0];
      return fieldReason ?? error.message;
    }
    return tCommon("errorDescription");
  }

  const mutation = useEmployerAction({
    locale,
    onSuccess(detail, vars) {
      setFeedback({
        tone: "success",
        message: t(`feedback.${vars.action}`, { company: detail.company_name }),
      });
      if (vars.action === "reject") {
        setRejectTarget(null);
        setRejectError(null);
      }
    },
    onError(error, vars) {
      const message = resolveErrorMessage(error);
      if (vars.action === "reject") {
        setRejectError(message);
      } else {
        setFeedback({ tone: "danger", message });
      }
    },
  });

  function runAction(vars: EmployerActionVars) {
    setFeedback(null);
    setPendingAction(vars);
    mutation.mutate(vars, {
      onSettled: () => setPendingAction(null),
    });
  }

  function handleAction(item: AdminEmployerListItem, action: AdminEmployerAction) {
    if (action === "reject") {
      setRejectError(null);
      setFeedback(null);
      setRejectTarget(item);
      return;
    }
    runAction({ id: item.id, action });
  }

  function handleConfirmReject(reason: string) {
    if (!rejectTarget) return;
    setRejectError(null);
    runAction({ id: rejectTarget.id, action: "reject", reason });
  }

  function changeStatus(next: AdminEmployerStatusFilter) {
    setStatus(next);
    setPage(1);
    setFeedback(null);
  }

  function changeSearch(next: string) {
    setSearchInput(next);
    setPage(1);
  }

  const statusSelectId = useId();
  const searchInputId = useId();

  const isActionPending = mutation.isPending;
  const data = query.data;
  const results = data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field label={t("filters.statusLabel")} className="sm:w-56">
          <Select
            id={statusSelectId}
            value={status}
            onChange={(event) =>
              changeStatus(event.target.value as AdminEmployerStatusFilter)
            }
          >
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === "ALL"
                  ? t("filters.statusAll")
                  : tStatus(statusLabelKey(value))}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.searchLabel")} className="flex-1">
          <Input
            id={searchInputId}
            type="search"
            value={searchInput}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
          />
        </Field>
      </div>

      {/* Action feedback */}
      {feedback ? (
        <Alert tone={feedback.tone === "success" ? "success" : "danger"}>
          {feedback.message}
        </Alert>
      ) : null}

      {/* List states */}
      {query.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : query.isError || !data ? (
        <Card>
          <ErrorState
            title={tCommon("errorTitle")}
            description={tCommon("errorDescription")}
            action={
              <button
                type="button"
                className="type-body-sm font-semibold text-brand-primary hover:underline"
                onClick={() => query.refetch()}
              >
                {tCommon("retry")}
              </button>
            }
          />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={query.isFetching}>
          {results.map((item) => (
            <li key={String(item.id)}>
              <EmployerRow
                item={item}
                locale={locale}
                disabled={isActionPending}
                pendingAction={
                  pendingAction && String(pendingAction.id) === String(item.id)
                    ? pendingAction.action
                    : null
                }
                onAction={handleAction}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {data && (data.next || data.previous) ? (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label={t("pagination.label")}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!data.previous || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("pagination.previous")}
          </Button>
          <span
            className="type-body-sm text-text-secondary"
            aria-live="polite"
          >
            {t("pagination.pageStatus", { page })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!data.next || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("pagination.next")}
          </Button>
        </nav>
      ) : null}

      <RejectEmployerDialog
        open={rejectTarget !== null}
        companyName={rejectTarget?.company_name ?? ""}
        pending={
          mutation.isPending && pendingAction?.action === "reject"
        }
        serverError={rejectError}
        onConfirm={handleConfirmReject}
        onCancel={() => {
          setRejectTarget(null);
          setRejectError(null);
        }}
      />
    </div>
  );
}

const ACTION_VARIANT: Record<
  AdminEmployerAction,
  "primary" | "secondary" | "danger"
> = {
  approve: "primary",
  reject: "danger",
  suspend: "danger",
  restore: "primary",
};

function EmployerRow({
  item,
  locale,
  disabled,
  pendingAction,
  onAction,
}: {
  item: AdminEmployerListItem;
  locale: string;
  disabled: boolean;
  pendingAction: AdminEmployerAction | null;
  onAction: (item: AdminEmployerListItem, action: AdminEmployerAction) => void;
}) {
  const t = useTranslations("admin.queue");
  const tStatus = useTranslations("admin");
  const created = formatDate(item.created_at, locale);
  const actions = actionsForStatus(item.approval_status);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-heading-3 text-text-primary">
            {item.company_name}
          </p>
          <p className="type-body-sm text-text-secondary">
            {item.contact_person} · {item.email}
          </p>
          {item.industry || item.company_location ? (
            <p className="type-caption text-text-secondary">
              {[item.industry, item.company_location]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <Badge tone={statusTone(item.approval_status)} withDot>
          {tStatus(statusLabelKey(item.approval_status))}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-caption text-text-secondary">
          {t("columns.created")}: {created ?? "—"}
        </p>
        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const busy = pendingAction === action;
              return (
                <Button
                  key={action}
                  size="sm"
                  variant={ACTION_VARIANT[action]}
                  disabled={disabled}
                  aria-busy={busy || undefined}
                  onClick={() => onAction(item, action)}
                >
                  {busy ? t(`actions.${action}Pending`) : t(`actions.${action}`)}
                </Button>
              );
            })}
          </div>
        ) : (
          <span className="type-caption text-text-muted">
            {t("noActions")}
          </span>
        )}
      </div>
    </Card>
  );
}
