"use client";

import { useTranslations } from "next-intl";

import { BRAND_LOGOS, BrandLogo } from "@/components/brand/BrandLogos";
import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { StarRating } from "@/features/reviews";

import type { PublicCompanyListItem } from "../types";

/**
 * Approved-company directory card (spec §14.4): logo, name, short summary,
 * location, active-role count, and the approved-employer marker. Optional
 * fields are omitted rather than shown as empty labels.
 */
export function CompanyCard({ company }: { company: PublicCompanyListItem }) {
  const t = useTranslations("companies.directory");
  const tBadge = useTranslations("common.badge");
  const tReviews = useTranslations("reviews");

  const averageLabel =
    company.average_rating !== null ? company.average_rating.toFixed(1) : null;

  return (
    <Card
      as="article"
      className="flex h-full flex-col gap-3 transition duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        {BRAND_LOGOS[company.slug] ? (
          <BrandLogo
            slug={company.slug}
            aria-hidden
            className="h-12 w-12 rounded-md border border-border-default object-contain"
          />
        ) : company.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo}
            alt=""
            className="h-12 w-12 rounded-md border border-border-default object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-subtle type-heading-3 text-text-secondary"
          >
            {company.company_name.charAt(0)}
          </span>
        )}
        <div className="flex flex-col gap-1">
          <h3 className="type-heading-3 text-text-primary">
            <Link
              href={`/companies/${company.slug}`}
              className="no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {company.company_name}
            </Link>
          </h3>
          <Badge tone="approved" withDot>
            {tBadge("approvedEmployer")}
          </Badge>
        </div>
      </div>

      {/* Compact rating line — only when the company has reviews. */}
      {company.review_count > 0 && averageLabel !== null ? (
        <div className="flex items-center gap-2 type-body-sm text-text-secondary">
          <StarRating
            value={company.average_rating ?? 0}
            label={tReviews("outOfFive", { rating: averageLabel })}
            size="sm"
          />
          <span>
            {averageLabel} ·{" "}
            {tReviews("summary.count", { count: company.review_count })}
          </span>
        </div>
      ) : null}

      {company.company_summary ? (
        <p className="type-body-sm line-clamp-3 text-text-secondary">
          {company.company_summary}
        </p>
      ) : null}

      {/* Pinned to the bottom so cards stay equal height regardless of summary
          length (the grid stretches each card via h-full). */}
      <div className="mt-auto flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 type-body-sm text-text-secondary">
          {company.company_location ? (
            <span>{company.company_location}</span>
          ) : null}
          <span>{t("activeJobCount", { count: company.active_job_count })}</span>
        </div>
        <Link
          href={`/companies/${company.slug}`}
          className="type-body-sm font-semibold text-brand-primary no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {t("learnMore")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Card>
  );
}
