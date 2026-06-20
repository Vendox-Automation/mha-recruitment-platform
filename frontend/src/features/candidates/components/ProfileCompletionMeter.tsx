"use client";

import { useTranslations } from "next-intl";

import type { ProfileCompletion } from "../types";

export interface ProfileCompletionMeterProps {
  completion: ProfileCompletion;
}

/**
 * Profile-completion indicator (spec §14.9 E). Renders the percentage as an
 * accessible `progressbar` (the visual bar mirrors the same value) plus a short
 * honest hint when work remains. No fabricated figures — the percent comes
 * straight from the server's deterministic completion calculation.
 */
export function ProfileCompletionMeter({
  completion,
}: ProfileCompletionMeterProps) {
  const t = useTranslations("candidate.dashboard.completion");
  const percent = Math.max(0, Math.min(100, completion.percent));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="type-label text-text-primary">{t("label")}</span>
        <span className="type-body-sm font-semibold text-text-primary">
          {t("percent", { percent })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("label")}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle"
      >
        <div
          className="h-full rounded-full bg-brand-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="type-caption">
        {completion.complete ? t("complete") : t("incomplete")}
      </p>
    </div>
  );
}
