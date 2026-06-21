"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge, Card, Tag } from "@/components/ui";
import { cn } from "@/lib/cn";

import { employmentTypeKey, formatDate, formatSalary } from "../format";
import type { PublicJobListItem } from "../types";

interface JobCardProps {
  job: PublicJobListItem;
  /** Marked as the active selection in the desktop split view. */
  selected?: boolean;
  /**
   * When provided, the card behaves as a selection button (split-screen
   * preview). When omitted, the title is a plain link to the full page.
   */
  onSelect?: (slug: string) => void;
  /** Render the title as a link element (companies page) vs. button (search). */
  as?: "button" | "link";
  /** Wrap the title in a navigational link (mobile list / company detail). */
  renderLink?: (slug: string, children: React.ReactNode) => React.ReactNode;
}

/**
 * Public job-search result card (spec §14.2). Shows the decision fields a
 * candidate compares on: title, company, location, salary (or an honest
 * "Salary not disclosed"), employment type, posted date, and the approved /
 * MHA-supported / easy-apply markers. Optional fields are omitted entirely
 * rather than rendered as empty labels (spec §14.3 missing-data).
 */
export function JobCard({
  job,
  selected,
  onSelect,
  as = "button",
  renderLink,
}: JobCardProps) {
  const t = useTranslations("jobs.card");
  const tSearch = useTranslations("jobs.search");
  const tType = useTranslations("jobs.employmentType");
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
  const typeKey = employmentTypeKey(job.employment_type);
  const employmentLabel = typeKey ? tType(typeKey) : job.employment_type;

  // Easy Apply == no screening questions required up front for list items we
  // only know is_mha_supported + approved; the easy-apply indicator is driven
  // by the detail payload, so on the card we surface the markers we have.
  const approved = Boolean(job.company); // public jobs always belong to approved employers

  const heading = (
    <span className="type-heading-3 text-text-primary">{job.title}</span>
  );

  return (
    <Card
      as="article"
      interactive={Boolean(onSelect)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex flex-col gap-3",
        selected && "border-brand-primary ring-1 ring-brand-primary",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {approved ? (
          <Badge tone="approved" withDot>
            {tBadge("approvedEmployer")}
          </Badge>
        ) : null}
        {job.is_mha_supported ? (
          <Badge tone="supported">{tBadge("mhaSupported")}</Badge>
        ) : null}
        {selected ? (
          <span className="ml-auto type-caption font-semibold text-brand-primary">
            {tSearch("selectedRole")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {as === "button" && onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(job.slug)}
            className="text-left no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            aria-pressed={selected}
            aria-label={tSearch("selectRole", { title: job.title })}
          >
            {heading}
          </button>
        ) : renderLink ? (
          renderLink(job.slug, heading)
        ) : (
          heading
        )}
        {job.company ? (
          <p className="type-body-sm text-text-secondary">
            {t("atCompany", { company: job.company.company_name })}
          </p>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-text-secondary">
        <div className="flex gap-1">
          <dt className="sr-only">{employmentLabel}</dt>
          <dd>
            <Tag>{employmentLabel}</Tag>
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <dd>{job.location ?? t("locationUnspecified")}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dd>
            {salary.disclosed ? salary.text : t("salaryNotDisclosed")}
          </dd>
        </div>
        {posted ? (
          <div className="flex items-center gap-1">
            <dt>{t("postedOn")}</dt>
            <dd>
              <time dateTime={job.published_at ?? undefined}>{posted}</time>
            </dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
