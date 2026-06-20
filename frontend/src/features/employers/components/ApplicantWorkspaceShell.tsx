"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

type View = "table" | "kanban" | "split";

const KANBAN_COLUMNS = [
  "applied",
  "underReview",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const;

const TABLE_COLUMNS = [
  "candidate",
  "job",
  "applied",
  "status",
  "resume",
  "updated",
  "actions",
] as const;

/**
 * Employer applicant workspace shell (spec §14.12). Switches among table,
 * Kanban, and split-screen views via an accessible tablist. Structural
 * placeholders only — no fabricated candidates; each view shows an honest empty
 * state. A privacy note reinforces that employers see only their own applicants.
 * Drag-and-drop / live status changes are wired in Phase 7.
 */
export function ApplicantWorkspaceShell() {
  const t = useTranslations("employer.applicants");
  const [view, setView] = useState<View>("table");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("title")} className="inline-flex rounded-md border border-border-strong p-1">
          {(["table", "kanban", "split"] as const).map((value) => {
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

      {view === "table" && (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-default bg-surface-raised">
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="type-label px-4 py-3 text-text-secondary"
                    >
                      {t(`columns.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="p-6">
                    <EmptyState
                      compact
                      title={t("emptyTitle")}
                      description={t("emptyBody")}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === "kanban" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {KANBAN_COLUMNS.map((col) => (
            <Card key={col} tone="subtle" className="flex flex-col gap-2">
              <h3 className="type-label text-text-primary">
                {t(`kanbanColumns.${col}`)}
              </h3>
              <p className="type-caption">{t("emptyTitle")}</p>
            </Card>
          ))}
        </div>
      )}

      {view === "split" && (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="flex flex-col gap-3">
            <h3 className="type-label text-text-primary">
              {t("split.listTitle")}
            </h3>
            <EmptyState
              compact
              title={t("emptyTitle")}
              description={t("emptyBody")}
            />
          </Card>
          <Card className="flex min-h-[16rem] items-center justify-center text-center">
            <p className="type-body-sm max-w-xs text-text-muted">
              {t("split.selectPrompt")}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
