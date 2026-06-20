"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DragEvent } from "react";

import { cn } from "@/lib/cn";

import { groupByStatus, KANBAN_COLUMNS, statusLabelKey } from "../board";
import type { ApplicationStatus, EmployerApplicantListItem } from "../types";
import { ApplicantStatusBadge } from "./ApplicantStatusBadge";

/**
 * Kanban board (spec §14.12). Seven status columns. A card can be moved between
 * columns TWO ways, so the workspace never depends on a pointer (spec §23):
 *
 *   1. Native HTML5 drag-and-drop (no library, per ownership constraint): a card
 *      is `draggable`; a column is a drop target.
 *   2. A keyboard-operable per-card "Move to stage" control — a labelled
 *      `<select>` of the seven stages that commits on change. This is the
 *      required keyboard alternative to drag-and-drop.
 *
 * Both paths call the SAME `onMove`, so optimistic update + rejection
 * confirmation (owned by the parent) apply identically. Moving to REJECTED is
 * confirmed by the parent before it commits.
 */
export function KanbanBoard({
  items,
  pendingId,
  onMove,
  onReview,
}: {
  items: EmployerApplicantListItem[];
  pendingId: string | null;
  onMove: (id: string, target: ApplicationStatus) => void;
  onReview: (id: string) => void;
}) {
  const t = useTranslations("employer.applicants");
  const grouped = groupByStatus(items);
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);

  function handleDrop(event: DragEvent<HTMLElement>, target: ApplicationStatus) {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/plain");
    if (id) onMove(id, target);
  }

  return (
    <div
      role="group"
      aria-label={t("views.kanban")}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
    >
      {KANBAN_COLUMNS.map((status) => {
        const columnItems = grouped[status];
        return (
          <section
            key={status}
            aria-label={t(statusLabelKey(status))}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragOver !== status) setDragOver(status);
            }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={(event) => handleDrop(event, status)}
            className={cn(
              "flex min-h-[8rem] flex-col gap-2 rounded-lg border bg-surface-subtle p-2",
              dragOver === status
                ? "border-brand-primary"
                : "border-border-default",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="type-label text-text-primary">
                {t(statusLabelKey(status))}
              </h3>
              <span className="type-caption tabular-nums">
                {columnItems.length}
              </span>
            </div>

            {columnItems.length === 0 ? (
              <p className="type-caption px-1 py-2 text-text-muted">
                {t("kanban.emptyColumn")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {columnItems.map((item) => (
                  <li key={item.id}>
                    <KanbanCard
                      item={item}
                      pending={item.id === pendingId}
                      onMove={onMove}
                      onReview={onReview}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function KanbanCard({
  item,
  pending,
  onMove,
  onReview,
}: {
  item: EmployerApplicantListItem;
  pending: boolean;
  onMove: (id: string, target: ApplicationStatus) => void;
  onReview: (id: string) => void;
}) {
  const t = useTranslations("employer.applicants");

  return (
    <div
      draggable={!pending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      aria-busy={pending || undefined}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border-default bg-surface-canvas p-2.5",
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => onReview(item.id)}
        className="type-body-sm text-left font-medium text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {item.candidate_name}
      </button>
      {item.candidate_title ? (
        <p className="type-caption truncate">{item.candidate_title}</p>
      ) : null}
      <ApplicantStatusBadge status={item.status} />

      {/* Keyboard alternative to drag-and-drop (spec §23). */}
      <label className="type-caption flex flex-col gap-1">
        <span>{t("kanban.moveLabel")}</span>
        <select
          value={item.status}
          disabled={pending}
          onChange={(event) =>
            onMove(item.id, event.target.value as ApplicationStatus)
          }
          className="h-9 rounded-md border border-border-strong bg-surface-canvas px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-55"
        >
          {KANBAN_COLUMNS.map((status) => (
            <option key={status} value={status}>
              {t(statusLabelKey(status))}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
