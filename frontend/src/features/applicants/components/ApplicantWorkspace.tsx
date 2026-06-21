"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  Alert,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
} from "@/components/ui";
import { ALL_STATUSES } from "@/features/applications";
import { cn } from "@/lib/cn";

import { needsConfirmation, statusLabelKey } from "../board";
import { jobApplicantsKey } from "../queryKeys";
import { getJobApplicants } from "../service";
import type { ApplicationStatus } from "../types";
import { useStatusMutation } from "../useStatusMutation";
import { ApplicantDetailPane } from "./ApplicantDetailPane";
import { ApplicantTable } from "./ApplicantTable";
import { CandidateListPanel } from "./CandidateListPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { KanbanBoard } from "./KanbanBoard";

type View = "split" | "table" | "kanban";

/** The three views; SPLIT is the default (spec §14.12 "split-screen as default"). */
const VIEWS: readonly View[] = ["split", "table", "kanban"];

type Ordering = "-submitted_at" | "submitted_at" | "-updated_at" | "status";

interface PendingReject {
  id: string;
  note: string;
}

/**
 * Per-job employer applicant workspace (spec §14.12). Owns the data query for
 * ONE owned job and switches among three views via an accessible tablist, with
 * SPLIT-SCREEN as the default. Search + status filter + sort are applied
 * client-side over the fetched rows (the per-job endpoint filters by status
 * server-side; we keep all rows cached and refine locally so switching views or
 * the keyword stays instant and preserves selection).
 *
 * Status changes (from Kanban or the split-screen stage control) flow through a
 * single handler: a move to REJECTED is confirmed first; every change is
 * optimistic with rollback on failure ({@link useStatusMutation}).
 */
export function ApplicantWorkspace({ jobId }: { jobId: string }) {
  const t = useTranslations("employer.applicants");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const [view, setView] = useState<View>("split");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "">("");
  const [ordering, setOrdering] = useState<Ordering>("-submitted_at");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<PendingReject | null>(null);

  // The full per-job list (unfiltered) is the cache we optimistically patch.
  const listKey = jobApplicantsKey(jobId);
  const query = useQuery({
    queryKey: listKey,
    queryFn: () => getJobApplicants(jobId, {}, locale),
  });

  const mutation = useStatusMutation({
    listKey,
    locale,
    onSettledSuccess: () => setErrorId(null),
    onRollback: (id) => setErrorId(id),
  });

  /** Commit a status change (already confirmed if it needed confirmation). */
  function commit(id: string, status: ApplicationStatus, note: string) {
    setErrorId(null);
    mutation.mutate({ id, status, change_note: note || undefined });
  }

  /** Entry point from any view: confirm a rejection, else commit immediately. */
  function changeStatus(id: string, status: ApplicationStatus, note = "") {
    if (needsConfirmation(status)) {
      setPendingReject({ id, note });
      return;
    }
    commit(id, status, note);
  }

  const allItems = useMemo(() => query.data?.results ?? [], [query.data]);

  // Client-side refine: status filter, keyword, then sort. Derived in render —
  // no setState-in-effect (repo lint rule).
  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = allItems.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        item.candidate_name.toLowerCase().includes(keyword) ||
        item.candidate_title.toLowerCase().includes(keyword)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      if (ordering === "status") return a.status.localeCompare(b.status);
      const field =
        ordering === "-updated_at" ? "updated_at" : "submitted_at";
      const cmp =
        new Date(b[field]).getTime() - new Date(a[field]).getTime();
      return ordering === "submitted_at" ? -cmp : cmp;
    });
    return sorted;
  }, [allItems, search, statusFilter, ordering]);

  // Effective selection for the split-screen, computed during render: the
  // explicit selection if it is still visible, else the first visible row.
  const effectiveSelectedId =
    selectedId && visibleItems.some((i) => i.id === selectedId)
      ? selectedId
      : (visibleItems[0]?.id ?? null);

  function openSplitOn(id: string) {
    setSelectedId(id);
    setView("split");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* View tablist */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t("viewsLabel")}
          className="inline-flex rounded-md border border-border-strong p-1"
        >
          {VIEWS.map((value) => {
            const selected = value === view;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setView(value)}
                className={cn(
                  "rounded-[0.3rem] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  selected
                    ? "bg-brand-primary text-brand-on-primary"
                    : "text-text-secondary hover:bg-surface-subtle",
                )}
              >
                {t(`views.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      <Alert tone="info">{t("privacyNote")}</Alert>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1">
          <label htmlFor="applicant-search" className="type-caption">
            {t("filters.searchLabel")}
          </label>
          <Input
            id="applicant-search"
            type="search"
            value={search}
            placeholder={t("filters.searchPlaceholder")}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="applicant-status" className="type-caption">
            {t("filters.statusLabel")}
          </label>
          <Select
            id="applicant-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ApplicationStatus | "")
            }
          >
            <option value="">{t("filters.statusAll")}</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(statusLabelKey(status))}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="applicant-sort" className="type-caption">
            {t("filters.sortLabel")}
          </label>
          <Select
            id="applicant-sort"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value as Ordering)}
          >
            <option value="-submitted_at">{t("filters.sort.newest")}</option>
            <option value="submitted_at">{t("filters.sort.oldest")}</option>
            <option value="-updated_at">{t("filters.sort.updated")}</option>
            <option value="status">{t("filters.sort.status")}</option>
          </Select>
        </div>
      </div>

      {/* Body */}
      {query.isLoading ? (
        <Card>
          <LoadingState
            title={tCommon("loadingTitle")}
            description={tCommon("loadingDescription")}
            spinnerLabel={tCommon("loadingSpinner")}
          />
        </Card>
      ) : query.isError || !query.data ? (
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
      ) : allItems.length === 0 ? (
        <Card>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
          />
        </Card>
      ) : view === "split" ? (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="flex flex-col gap-3">
            <h3 className="type-label text-text-primary">
              {t("split.listTitle")}
            </h3>
            <CandidateListPanel
              items={visibleItems}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
            />
          </Card>
          {effectiveSelectedId ? (
            <ApplicantDetailPane
              key={effectiveSelectedId}
              applicantId={effectiveSelectedId}
              pending={mutation.isPending}
              lastError={errorId === effectiveSelectedId}
              onChangeStatus={changeStatus}
            />
          ) : (
            <Card className="flex min-h-[16rem] items-center justify-center text-center">
              <p className="type-body-sm max-w-xs text-text-muted">
                {t("split.selectPrompt")}
              </p>
            </Card>
          )}
        </div>
      ) : view === "table" ? (
        <ApplicantTable items={visibleItems} onReview={openSplitOn} />
      ) : (
        <>
          {errorId ? (
            <Alert tone="danger">{t("kanban.moveError")}</Alert>
          ) : null}
          <KanbanBoard
            items={visibleItems}
            pendingId={mutation.isPending ? mutation.variables?.id ?? null : null}
            onMove={(id, target) => changeStatus(id, target)}
            onReview={openSplitOn}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingReject !== null}
        title={t("rejectConfirm.title")}
        description={t("rejectConfirm.body")}
        confirmLabel={t("rejectConfirm.confirm")}
        cancelLabel={t("rejectConfirm.cancel")}
        onCancel={() => setPendingReject(null)}
        onConfirm={() => {
          if (pendingReject) {
            commit(pendingReject.id, "REJECTED", pendingReject.note);
          }
          setPendingReject(null);
        }}
      />
    </div>
  );
}
