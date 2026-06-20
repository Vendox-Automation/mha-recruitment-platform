"use client";

import { useTranslations } from "next-intl";

import { Badge, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

import type { PublicCompanyListItem } from "../types";

/**
 * Approved-company directory card (spec §14.4): logo, name, short summary,
 * location, active-role count, and the approved-employer marker. Optional
 * fields are omitted rather than shown as empty labels.
 */
export function CompanyCard({ company }: { company: PublicCompanyListItem }) {
  const t = useTranslations("companies.directory");
  const tBadge = useTranslations("common.badge");

  return (
    <Card as="article" interactive className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {company.logo ? (
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

      {company.company_summary ? (
        <p className="type-body-sm line-clamp-3 text-text-secondary">
          {company.company_summary}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 type-body-sm text-text-secondary">
        {company.company_location ? <span>{company.company_location}</span> : null}
        <span>{t("activeJobCount", { count: company.active_job_count })}</span>
      </div>
    </Card>
  );
}
