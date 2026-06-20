"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Card, ErrorState, LoadingState } from "@/components/ui";
import { formatDate } from "@/features/applications";
import { employmentTypeKeyOrNull } from "@/features/candidates/format";

import { applicantDetailKey } from "../queryKeys";
import { applicantResumeUrl, getApplicant } from "../service";
import type { ApplicationStatus } from "../types";
import { ApplicantStatusBadge } from "./ApplicantStatusBadge";
import { PrivateNotesPanel } from "./PrivateNotesPanel";
import { StageControl } from "./StageControl";

/**
 * Right-hand review pane of the split-screen (spec §14.12): the selected
 * applicant's profile summary, screening answers, cover letter, a
 * permission-checked Resume "Open / Download" link (new tab — NO public URL),
 * the current stage with keyboard-operable stage controls, and the
 * employer-only private notes editor. Owns its own loading / error states.
 *
 * Status changes here go through the parent's mutation (`onChangeStatus`) so the
 * optimistic list update + rejection confirmation are shared with the Kanban.
 */
export function ApplicantDetailPane({
  applicantId,
  pending,
  lastError,
  onChangeStatus,
}: {
  applicantId: string;
  pending: boolean;
  lastError: boolean;
  onChangeStatus: (
    id: string,
    status: ApplicationStatus,
    note: string,
  ) => void;
}) {
  const t = useTranslations("employer.applicants");
  const tEmployment = useTranslations("jobs.employmentType");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery({
    queryKey: applicantDetailKey(applicantId),
    queryFn: () => getApplicant(applicantId, locale),
  });

  if (query.isLoading) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => query.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const detail = query.data;
  const employmentKey = employmentTypeKeyOrNull(
    detail.candidate.preferred_employment_type,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header: name, current stage */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="type-heading-3 text-text-primary">
              {detail.candidate.full_name}
            </h2>
            {detail.candidate.preferred_job_title ? (
              <p className="type-body-sm text-text-secondary">
                {detail.candidate.preferred_job_title}
              </p>
            ) : null}
          </div>
          <ApplicantStatusBadge status={detail.status} />
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <Detail label={t("profile.phone")} value={detail.candidate.phone} />
          <Detail
            label={t("profile.location")}
            value={detail.candidate.preferred_location}
          />
          <Detail
            label={t("profile.type")}
            value={
              employmentKey
                ? tEmployment(employmentKey)
                : detail.candidate.preferred_employment_type
            }
          />
          <Detail
            label={t("profile.applied")}
            value={formatDate(detail.submitted_at, locale) ?? "—"}
          />
        </dl>
      </Card>

      {/* Resume — permission-checked download (no public URL) */}
      <Card className="flex flex-col gap-2">
        <h3 className="type-label text-text-primary">{t("resume.title")}</h3>
        {detail.has_resume_snapshot ? (
          <a
            href={applicantResumeUrl(detail.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="type-body-sm font-semibold text-brand-primary hover:underline"
          >
            {detail.resume_snapshot_name
              ? t("resume.openNamed", { name: detail.resume_snapshot_name })
              : t("resume.open")}
          </a>
        ) : (
          <p className="type-body-sm text-text-secondary">{t("resume.none")}</p>
        )}
      </Card>

      {/* Cover letter */}
      <Card className="flex flex-col gap-2">
        <h3 className="type-label text-text-primary">
          {t("coverLetter.title")}
        </h3>
        {detail.cover_letter ? (
          <p className="type-body-sm whitespace-pre-wrap text-text-secondary">
            {detail.cover_letter}
          </p>
        ) : (
          <p className="type-body-sm text-text-secondary">
            {t("coverLetter.none")}
          </p>
        )}
      </Card>

      {/* Screening answers */}
      <Card className="flex flex-col gap-3">
        <h3 className="type-label text-text-primary">{t("answers.title")}</h3>
        {detail.answers.length === 0 ? (
          <p className="type-body-sm text-text-secondary">{t("answers.none")}</p>
        ) : (
          <dl className="flex flex-col gap-3">
            {detail.answers.map((answer, index) => (
              <div key={`${answer.question.id}-${index}`} className="flex flex-col gap-1">
                <dt className="type-body-sm font-medium text-text-primary">
                  {answer.question.question}
                </dt>
                <dd className="type-body-sm text-text-secondary">
                  {renderAnswer(answer) || t("answers.blank")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* Stage controls */}
      <Card className="flex flex-col gap-3">
        <h3 className="type-label text-text-primary">{t("stage.title")}</h3>
        <StageControl
          current={detail.status}
          pending={pending}
          onSubmit={(status, note) =>
            onChangeStatus(detail.id, status, note)
          }
        />
        {lastError ? (
          <p role="alert" className="type-caption text-status-danger">
            {t("stage.error")}
          </p>
        ) : null}
      </Card>

      {/* Employer-only private notes */}
      <Card className="flex flex-col gap-3">
        <h3 className="type-label text-text-primary">{t("notes.title")}</h3>
        <PrivateNotesPanel
          key={detail.id}
          applicantId={detail.id}
          initialNotes={detail.employer_private_notes}
        />
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption">{label}</dt>
      <dd className="type-body-sm text-text-primary">{value || "—"}</dd>
    </div>
  );
}

/** Render a screening answer (text or the stored JSON value) as plain text. */
function renderAnswer(answer: {
  answer_text: string | null;
  answer_json: unknown;
}): string {
  if (answer.answer_text) return answer.answer_text;
  const json = answer.answer_json;
  if (json === null || json === undefined) return "";
  if (typeof json === "string" || typeof json === "number") return String(json);
  if (typeof json === "boolean") return String(json);
  if (Array.isArray(json)) return json.map(String).join(", ");
  return "";
}
