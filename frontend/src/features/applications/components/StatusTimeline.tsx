"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui";

import { formatDateTime } from "../format";
import { statusLabelKey } from "../status";
import type { ApplicationStatus, ApplicationStatusHistoryEntry } from "../types";

/**
 * Visual status timeline (spec §14.9). An ordered list (semantic `<ol>`) of
 * transitions, newest first: each item shows the date, the from → to stages,
 * the change note, and whether the move came from the employer or the platform.
 *
 * Accessibility: the connecting rail is decorative (`aria-hidden`); every cue —
 * stage, source, date — is in text, so meaning never depends on colour or the
 * rail alone (spec §13.7, §23).
 */
export function StatusTimeline({
  entries,
}: {
  entries: ApplicationStatusHistoryEntry[];
}) {
  const t = useTranslations("candidate.applications");
  const tTimeline = useTranslations("candidate.applications.timeline");
  const locale = useLocale();

  if (entries.length === 0) {
    return (
      <p className="type-body-sm text-text-secondary">{tTimeline("empty")}</p>
    );
  }

  // Newest first.
  const ordered = [...entries].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <ol className="flex flex-col gap-0">
      {ordered.map((entry, index) => {
        const isLast = index === ordered.length - 1;
        return (
          <li key={`${entry.to_status}-${entry.created_at}-${index}`} className="flex gap-3">
            {/* Decorative rail + node */}
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-primary" />
              {!isLast ? (
                <span className="w-px flex-1 bg-border-strong" />
              ) : null}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <p className="type-caption">
                {formatDateTime(entry.created_at, locale) ?? ""}
              </p>
              <p className="type-body-sm font-medium text-text-primary">
                {entry.from_status ? (
                  <>
                    {t(statusLabelKey(entry.from_status as ApplicationStatus))}
                    {" → "}
                  </>
                ) : null}
                {t(statusLabelKey(entry.to_status))}
              </p>
              <div className="mt-1">
                <Badge tone={entry.source === "employer" ? "info" : "neutral"}>
                  {tTimeline(`source.${entry.source}`)}
                </Badge>
              </div>
              {entry.change_note ? (
                <p className="type-body-sm mt-1.5 text-text-secondary">
                  {entry.change_note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
