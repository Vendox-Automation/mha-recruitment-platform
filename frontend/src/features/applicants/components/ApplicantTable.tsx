"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/features/applications";

import { applicantResumeUrl } from "../service";
import type { EmployerApplicantListItem } from "../types";
import { ApplicantStatusBadge } from "./ApplicantStatusBadge";

const COLUMNS = [
  "candidate",
  "job",
  "applied",
  "status",
  "resume",
  "updated",
  "actions",
] as const;

/**
 * Table view of the applicants (spec §14.12). A dense, calm working table:
 * candidate, job, applied date, status, a permission-checked resume link, last
 * updated, and a "Review" action that opens the split-screen on that candidate.
 * Search / status filter / sort are owned by the parent workspace; this renders
 * the already-filtered, already-sorted rows.
 */
export function ApplicantTable({
  items,
  onReview,
}: {
  items: EmployerApplicantListItem[];
  onReview: (id: string) => void;
}) {
  const t = useTranslations("employer.applicants");
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          title={t("emptyTitle")}
          description={t("emptyFilteredBody")}
        />
      </Card>
    );
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr className="border-b border-border-default bg-surface-raised">
              {COLUMNS.map((col) => (
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
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border-default last:border-b-0"
              >
                <td className="px-4 py-3">
                  <span className="type-body-sm font-medium text-text-primary">
                    {item.candidate_name}
                  </span>
                  {item.candidate_title ? (
                    <p className="type-caption">{item.candidate_title}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {item.job.title}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(item.submitted_at, locale) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ApplicantStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  {item.has_resume_snapshot ? (
                    <a
                      href={applicantResumeUrl(item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="type-body-sm font-semibold text-brand-primary hover:underline"
                    >
                      {t("resume.open")}
                    </a>
                  ) : (
                    <span className="type-caption">{t("resume.none")}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(item.updated_at, locale) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onReview(item.id)}
                    className="type-body-sm font-semibold text-brand-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    {t("review")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
