"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

import type { EmployerApplicantListItem } from "../types";
import { ApplicantStatusBadge } from "./ApplicantStatusBadge";

/**
 * Keyboard-selectable candidate list — the LEFT pane of the split-screen
 * (spec §14.12, §23). Rendered as a single-select listbox: arrow keys move the
 * active option, Enter/Space selects, and the selected row is reflected via
 * `aria-selected`. Selecting moves focus management to the parent (which renders
 * the detail pane), but the list itself stays operable from the keyboard alone.
 */
export function CandidateListPanel({
  items,
  selectedId,
  onSelect,
}: {
  items: EmployerApplicantListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("employer.applicants");
  const optionRefs = useRef<Record<string, HTMLLIElement | null>>({});

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title={t("emptyTitle")}
        description={t("emptyFilteredBody")}
      />
    );
  }

  function moveFocus(currentIndex: number, delta: number) {
    const next = items[currentIndex + delta];
    if (next) {
      optionRefs.current[next.id]?.focus();
    }
  }

  return (
    <ul
      role="listbox"
      aria-label={t("split.listTitle")}
      className="flex max-h-[32rem] flex-col gap-1 overflow-y-auto"
    >
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        return (
          <li
            key={item.id}
            ref={(node) => {
              optionRefs.current[item.id] = node;
            }}
            role="option"
            aria-selected={selected}
            tabIndex={selected || (selectedId === null && index === 0) ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.id);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                moveFocus(index, 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(index, -1);
              }
            }}
            className={cn(
              "cursor-pointer rounded-md border px-3 py-2.5 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
              selected
                ? "border-brand-primary bg-brand-primary-soft"
                : "border-transparent hover:bg-surface-subtle",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-body-sm min-w-0 truncate font-medium text-text-primary">
                {item.candidate_name}
              </span>
              <ApplicantStatusBadge status={item.status} />
            </div>
            {item.candidate_title ? (
              <p className="type-caption truncate">{item.candidate_title}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
