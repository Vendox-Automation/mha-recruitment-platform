"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge, Tag } from "@/components/ui";

import { employmentTypeKey, formatDate, formatSalary } from "../format";
import type { PublicJobDetail } from "../types";

/**
 * Decision-first job header (spec §14.3): title, company, location, employment
 * type, salary, posted date, deadline, and the approved / MHA-supported
 * markers. Optional fields are omitted entirely — never an empty label.
 *
 * `compact` is used in the split-screen preview pane; the full page uses the
 * default size.
 */
export function JobDetailHeader({
  job,
  compact,
}: {
  job: PublicJobDetail;
  compact?: boolean;
}) {
  const t = useTranslations("jobs.detail");
  const tType = useTranslations("jobs.employmentType");
  const tCard = useTranslations("jobs.card");
  const tPeriod = useTranslations("jobs.salaryPeriod");
  const tBadge = useTranslations("common.badge");
  const locale = useLocale();

  const periodLabels: Record<string, string> = {
    year: tPeriod("year"),
    month: tPeriod("month"),
    week: tPeriod("week"),
    day: tPeriod("day"),
    hour: tPeriod("hour"),
  };
  const salary = formatSalary(job, locale, periodLabels);
  const posted = formatDate(job.published_at, locale);
  const deadline = formatDate(job.application_deadline, locale);
  const typeKey = employmentTypeKey(job.employment_type);
  const employmentLabel = typeKey ? tType(typeKey) : job.employment_type;
  const easyApply = job.screening_questions.length === 0;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {job.company ? (
          <Badge tone="approved" withDot>
            {tBadge("approvedEmployer")}
          </Badge>
        ) : null}
        {job.is_mha_supported ? (
          <Badge tone="supported">{tBadge("mhaSupported")}</Badge>
        ) : null}
        {easyApply ? (
          <Badge tone="easyApply">{tBadge("easyApply")}</Badge>
        ) : null}
      </div>

      <h1
        className={compact ? "type-heading-2 text-text-primary" : "type-heading-1 text-text-primary"}
        lang={job.listing_language}
      >
        {job.title}
      </h1>

      {job.company ? (
        <p className="type-body text-text-secondary">
          {tCard("atCompany", { company: job.company.company_name })}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Tag>{employmentLabel}</Tag>
        <Tag>{job.location ?? tCard("locationUnspecified")}</Tag>
        <Tag>{salary.disclosed ? salary.text : tCard("salaryNotDisclosed")}</Tag>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 type-body-sm text-text-secondary">
        {posted ? (
          <div className="flex gap-1">
            <dt>{t("postedOn")}</dt>
            <dd>
              <time dateTime={job.published_at ?? undefined}>{posted}</time>
            </dd>
          </div>
        ) : null}
        {deadline ? (
          <div className="flex gap-1">
            <dt>{t("deadline")}</dt>
            <dd>
              <time dateTime={job.application_deadline ?? undefined}>
                {deadline}
              </time>
            </dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
