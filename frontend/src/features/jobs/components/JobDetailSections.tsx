"use client";

import { useTranslations } from "next-intl";

import { Alert, Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

import type { PublicJobDetail } from "../types";

/**
 * Long-form job-detail sections (spec §14.3): description, requirements, a
 * Smart Job Fit placeholder (real, rule-based fit is Phase 8 — we render an
 * honest "sign in to see fit" block with NO fabricated score), a screening
 * preview when present, company overview, and the MHA support prompt.
 *
 * Employer-authored text keeps its `listing_language`; only the chrome is
 * localised. `compact` trims the layout for the split-screen preview pane.
 */
export function JobDetailSections({
  job,
  compact,
}: {
  job: PublicJobDetail;
  compact?: boolean;
}) {
  const t = useTranslations("jobs.detail");
  const Wrapper = compact ? "div" : Card;

  return (
    <div className="flex flex-col gap-5">
      {/* Description */}
      <Wrapper className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("sections.description")}
        </h2>
        {job.description?.trim() ? (
          <p className="type-body whitespace-pre-line text-text-secondary" lang={job.listing_language}>
            {job.description}
          </p>
        ) : (
          <p className="type-body-sm text-text-muted">{t("noDescription")}</p>
        )}
      </Wrapper>

      {/* Requirements */}
      <Wrapper className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("sections.requirements")}
        </h2>
        {job.requirements?.trim() ? (
          <p className="type-body whitespace-pre-line text-text-secondary" lang={job.listing_language}>
            {job.requirements}
          </p>
        ) : (
          <p className="type-body-sm text-text-muted">{t("noRequirements")}</p>
        )}
      </Wrapper>

      {/* Smart Job Fit — placeholder only, no fake score (Phase 8). */}
      <Wrapper className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("sections.jobFit")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("fit.previewBody")}</p>
        <Alert tone="info" title={t("fit.previewTitle")}>
          {t("fit.disclaimer")}
        </Alert>
      </Wrapper>

      {/* Screening preview — only when the job has questions. */}
      {job.screening_questions.length > 0 ? (
        <Wrapper className="flex flex-col gap-3">
          <h2 className="type-heading-3 text-text-primary">
            {t("sections.screening")}
          </h2>
          <p className="type-body-sm text-text-secondary">
            {t("screeningIntro")}
          </p>
          <ul className="flex flex-col gap-2">
            {job.screening_questions
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((q) => (
                <li key={q.id} className="flex flex-col gap-1">
                  <span className="type-body-sm text-text-primary">
                    {q.question}
                  </span>
                  {q.is_required ? (
                    <Badge tone="neutral">{t("screeningRequired")}</Badge>
                  ) : null}
                </li>
              ))}
          </ul>
        </Wrapper>
      ) : null}

      {/* Company overview */}
      {job.company ? (
        <Wrapper className="flex flex-col gap-2">
          <h2 className="type-heading-3 text-text-primary">
            {t("sections.company")}
          </h2>
          <p className="type-body text-text-primary">
            {job.company.company_name}
          </p>
          {job.company.company_location ? (
            <p className="type-body-sm text-text-secondary">
              {job.company.company_location}
            </p>
          ) : null}
          <Link
            href={`/companies/${job.company.slug}`}
            className="type-body-sm text-brand-primary no-underline hover:underline"
          >
            {t("viewCompanyProfile")}
          </Link>
        </Wrapper>
      ) : null}

      {/* MHA support prompt */}
      <Card tone="subtle" className="flex flex-col gap-2">
        <h2 className="type-heading-3 text-text-primary">
          {t("support.title")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("support.body")}</p>
        <div className="mt-1">
          <Link
            href="/career-support"
            className="type-body-sm text-brand-primary no-underline hover:underline"
          >
            {t("support.cta")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
