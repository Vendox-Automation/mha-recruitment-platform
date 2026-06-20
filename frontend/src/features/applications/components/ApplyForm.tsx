"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  Alert,
  Button,
  Field,
  Input,
  LinkButton,
  Radio,
  Select,
  SuccessState,
  Textarea,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";

import { buildAnswersPayload, type AnswerableQuestion } from "../answers";
import {
  APPLICATIONS_LIST_KEY,
  jobApplicationStatusKey,
} from "../queryKeys";
import { apply, getJobApplicationStatus } from "../service";
import type { ApplicationDetail } from "../types";
import { ensureCsrf } from "@/lib/api/auth";

/** A screening question as the apply form needs it (from the public job detail). */
export interface ApplyScreeningQuestion {
  id: string | number;
  question: string;
  question_type: string;
  is_required: boolean;
  options_json: string[];
}

export interface ApplyFormProps {
  slug: string;
  jobTitle: string;
  companyName: string | null;
  questions: ApplyScreeningQuestion[];
  /** Whether the candidate already has a resume on file (drives the no-resume hint). */
  hasResume: boolean;
}

type Phase = "edit" | "review" | "done";

/**
 * Candidate apply experience (spec §10.1, §14.3). Renders the cover letter and a
 * screening-questions section with the correct accessible control per type, runs
 * a client-side required check (the server stays authoritative — spec §10), then
 * a review step before submitting.
 *
 * States (CLAUDE.md): inline per-question errors, a form-level error, a disabled
 * in-flight submit, a no-resume error that links to /candidate/resume, a 409
 * "already applied" path that links to the existing application, and a success
 * confirmation linking to the new application.
 */
export function ApplyForm({
  slug,
  jobTitle,
  companyName,
  questions,
  hasResume,
}: ApplyFormProps) {
  const t = useTranslations("candidate.applications");
  const tApply = useTranslations("candidate.applications.apply");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("edit");
  const [coverLetter, setCoverLetter] = useState("");
  const [rawAnswers, setRawAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [noResume, setNoResume] = useState(false);
  const [conflict, setConflict] = useState<ApplicationDetail | null>(null);
  const [created, setCreated] = useState<ApplicationDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const answerable: AnswerableQuestion[] = questions.map((q) => ({
    id: q.id,
    question_type: q.question_type,
    is_required: q.is_required,
    options_json: q.options_json,
  }));

  function setAnswer(id: string, value: string) {
    setRawAnswers((prev) => ({ ...prev, [id]: value }));
  }

  /** Validate client-side; on success move to the review step. */
  function onReview(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const { errors } = buildAnswersPayload(answerable, rawAnswers);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setPhase("review");
  }

  async function onSubmit() {
    setSubmitting(true);
    setFormError(null);
    setNoResume(false);
    setConflict(null);
    const { payload: answers } = buildAnswersPayload(answerable, rawAnswers);
    try {
      await ensureCsrf(locale);
      const application = await apply(
        slug,
        {
          cover_letter: coverLetter.trim() || undefined,
          answers: Object.keys(answers).length > 0 ? answers : undefined,
        },
        locale,
      );
      await queryClient.invalidateQueries({ queryKey: APPLICATIONS_LIST_KEY });
      await queryClient.invalidateQueries({
        queryKey: jobApplicationStatusKey(slug),
      });
      setCreated(application);
      setPhase("done");
    } catch (error) {
      await handleSubmitError(error);
      setPhase("edit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitError(error: unknown) {
    if (!(error instanceof ApiRequestError)) {
      setFormError(tApply("errorGeneric"));
      return;
    }

    // 409 — already applied. Surface a "View Application" path, not a retry.
    // Probe the existing application so the link points at the right id.
    if (error.status === 409) {
      setFormError(tApply("conflict"));
      try {
        const existing = await getJobApplicationStatus(slug, locale);
        if (existing) setConflict(existing);
      } catch {
        // Leave the conflict message without a deep link if the probe fails.
      }
      return;
    }

    // 404 — the role is no longer public.
    if (error.status === 404) {
      setFormError(tApply("jobUnavailable"));
      return;
    }

    const fields = error.fields ?? {};
    const nextFieldErrors: Record<string, string> = {};
    let leftover = false;

    for (const [key, messages] of Object.entries(fields)) {
      const message = messages.join(" ");
      if (key === "resume") {
        setNoResume(true);
        continue;
      }
      if (key === "answers") {
        // DRF may nest per-question errors under answers.<id>.
        leftover = true;
        continue;
      }
      if (key.startsWith("answers.")) {
        nextFieldErrors[key.slice("answers.".length)] = message;
        continue;
      }
      if (key === "cover_letter") {
        nextFieldErrors.__cover = message;
        continue;
      }
      // Per-question errors may also arrive keyed directly by question id.
      if (answerable.some((q) => String(q.id) === key)) {
        nextFieldErrors[key] = message;
        continue;
      }
      leftover = true;
    }

    setFieldErrors(nextFieldErrors);
    if (leftover || (!Object.keys(nextFieldErrors).length && !error.fields)) {
      setFormError(error.message || tApply("errorGeneric"));
    }
  }

  // --- Success ---------------------------------------------------------------
  if (phase === "done" && created) {
    return (
      <SuccessState
        title={tApply("successTitle")}
        description={tApply("successBody", { job: jobTitle })}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton href={`/candidate/applications/${created.id}`}>
              {tApply("viewApplication")}
            </LinkButton>
            <LinkButton href="/jobs" variant="secondary">
              {t("browseJobs")}
            </LinkButton>
          </div>
        }
      />
    );
  }

  const showConflictAction = conflict !== null;

  // --- Review ----------------------------------------------------------------
  if (phase === "review") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="type-heading-3 text-text-primary">
            {tApply("reviewTitle")}
          </h2>
          <p className="type-body-sm text-text-secondary">
            {tApply("reviewBody")}
          </p>
        </div>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        {noResume ? <NoResumeAlert /> : null}

        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="type-label text-text-primary">
              {tApply("coverLetterLabel")}
            </dt>
            <dd className="type-body-sm whitespace-pre-wrap text-text-secondary">
              {coverLetter.trim() || tApply("coverLetterEmpty")}
            </dd>
          </div>
          {questions.map((q) => (
            <div key={String(q.id)} className="flex flex-col gap-1">
              <dt className="type-label text-text-primary">{q.question}</dt>
              <dd className="type-body-sm text-text-secondary">
                {reviewValue(q, rawAnswers[String(q.id)], tApply)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? tApply("submitting") : tApply("submit")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPhase("edit")}
            disabled={submitting}
          >
            {tApply("editAgain")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Edit ------------------------------------------------------------------
  return (
    <form className="flex flex-col gap-6" onSubmit={onReview} noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="type-heading-3 text-text-primary">
          {tApply("title")}
        </h2>
        <p className="type-body-sm text-text-secondary">
          {companyName
            ? tApply("leadWithCompany", { job: jobTitle, company: companyName })
            : tApply("lead", { job: jobTitle })}
        </p>
      </div>

      {formError ? (
        <Alert tone="danger">
          {formError}
          {showConflictAction ? (
            <span className="ml-2 inline-block">
              <LinkButton
                href={`/candidate/applications/${conflict?.id}`}
                size="sm"
                variant="secondary"
              >
                {tApply("viewApplication")}
              </LinkButton>
            </span>
          ) : null}
        </Alert>
      ) : null}

      {noResume ? <NoResumeAlert /> : null}

      {!hasResume ? (
        <Alert tone="warning" title={tApply("resumeNeededTitle")}>
          {tApply("resumeNeededBody")}{" "}
          <LinkButton href="/candidate/resume" size="sm" variant="ghost">
            {tApply("uploadResume")}
          </LinkButton>
        </Alert>
      ) : null}

      <Field
        label={tApply("coverLetterLabel")}
        hint={tApply("coverLetterHint")}
        error={fieldErrors.__cover}
      >
        <Textarea
          rows={6}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder={tApply("coverLetterPlaceholder")}
        />
      </Field>

      {questions.length > 0 ? (
        <fieldset className="flex flex-col gap-5 border-0 p-0">
          <legend className="type-label text-text-primary">
            {tApply("screeningTitle")}
          </legend>
          {questions.map((q) => (
            <ScreeningField
              key={String(q.id)}
              question={q}
              value={rawAnswers[String(q.id)] ?? ""}
              onChange={(value) => setAnswer(String(q.id), value)}
              error={fieldErrors[String(q.id)]}
            />
          ))}
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit">{tApply("reviewCta")}</Button>
      </div>
    </form>
  );
}

/** The no-resume error: explains the block and links to the resume manager. */
function NoResumeAlert() {
  const tApply = useTranslations("candidate.applications.apply");
  return (
    <Alert tone="danger" title={tApply("noResumeTitle")}>
      {tApply("noResumeBody")}{" "}
      <LinkButton href="/candidate/resume" size="sm" variant="secondary">
        {tApply("uploadResume")}
      </LinkButton>
    </Alert>
  );
}

/** Render the right accessible control for a screening question type. */
function ScreeningField({
  question,
  value,
  onChange,
  error,
}: {
  question: ApplyScreeningQuestion;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const t = useTranslations("candidate.applications");
  const tApply = useTranslations("candidate.applications.apply");
  const errorText = error ? errorMessage(error, t) : undefined;
  const id = `q-${String(question.id)}`;

  // YES_NO and SINGLE_CHOICE use a radio group inside a fieldset/legend so the
  // group has an accessible name and is not colour-dependent (spec §23).
  if (question.question_type === "YES_NO") {
    return (
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="type-body-sm font-medium text-text-primary">
          {question.question}
          {question.is_required ? (
            <span className="ml-1 text-status-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
        <div className="flex flex-col gap-2">
          <Radio
            name={id}
            label={tApply("yes")}
            checked={value === "true"}
            onChange={() => onChange("true")}
          />
          <Radio
            name={id}
            label={tApply("no")}
            checked={value === "false"}
            onChange={() => onChange("false")}
          />
        </div>
        {errorText ? (
          <p role="alert" className="type-body-sm text-status-danger">
            {errorText}
          </p>
        ) : null}
      </fieldset>
    );
  }

  if (question.question_type === "SINGLE_CHOICE") {
    return (
      <Field
        label={question.question}
        required={question.is_required}
        error={errorText}
      >
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{tApply("choosePlaceholder")}</option>
          {question.options_json.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (question.question_type === "LONG_TEXT") {
    return (
      <Field
        label={question.question}
        required={question.is_required}
        error={errorText}
      >
        <Textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  // SHORT_TEXT, NUMBER, and any unknown type → single-line input.
  return (
    <Field
      label={question.question}
      required={question.is_required}
      error={errorText}
    >
      <Input
        type={question.question_type === "NUMBER" ? "number" : "text"}
        inputMode={question.question_type === "NUMBER" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Map a client error key (from buildAnswersPayload) to localised text. */
function errorMessage(
  key: string,
  t: ReturnType<typeof useTranslations>,
): string {
  if (key.startsWith("errors.")) {
    return t(key);
  }
  // Already a server-provided message string.
  return key;
}

/** Render a question's chosen value for the review step. */
function reviewValue(
  question: ApplyScreeningQuestion,
  raw: string | undefined,
  tApply: ReturnType<typeof useTranslations>,
): string {
  const value = (raw ?? "").trim();
  if (value === "") return tApply("notAnswered");
  if (question.question_type === "YES_NO") {
    return value === "true" ? tApply("yes") : tApply("no");
  }
  return value;
}
