"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui";

import { formatDate } from "../format";
import { resumeDownloadUrl } from "../service";

export interface ResumeSummaryProps {
  hasResume: boolean;
  originalName: string | null;
  uploadedAt: string | null;
  /** Optional actions rendered beneath the summary (e.g. manage link). */
  actions?: ReactNode;
}

/**
 * Read-only resume summary (spec §22.2). Shows the original filename + upload
 * date and a Download/Open link that opens the permission-checked download
 * endpoint in a new tab via {@link resumeDownloadUrl} — a top-level GET that
 * carries the session cookie. NO public file URL is ever constructed.
 *
 * When there is no resume on file it renders an honest empty line plus whatever
 * `actions` the caller supplies (e.g. an "Upload" link).
 */
export function ResumeSummary({
  hasResume,
  originalName,
  uploadedAt,
  actions,
}: ResumeSummaryProps) {
  const t = useTranslations("candidate.resume");
  const locale = useLocale();
  const uploaded = formatDate(uploadedAt, locale);

  if (!hasResume) {
    return (
      <div className="flex flex-col gap-3">
        <p className="type-body-sm text-text-secondary">{t("noneOnFile")}</p>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">{t("onFileBadge")}</Badge>
        <span className="type-body font-medium text-text-primary">
          {originalName ?? t("unnamedFile")}
        </span>
      </div>
      {uploaded ? (
        <p className="type-caption">{t("uploadedOn", { date: uploaded })}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={resumeDownloadUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="type-body-sm font-semibold text-brand-primary hover:underline"
        >
          {t("download")}
        </a>
        {actions}
      </div>
    </div>
  );
}
