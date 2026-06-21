"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useRouter } from "@/i18n/navigation";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LinkButton,
  Select,
  SuccessState,
} from "@/components/ui";
import { ensureCsrf, registerCandidate } from "@/lib/api/auth";
import { destinationForUser, useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

import {
  CANDIDATE_STEP_FIELDS,
  candidateRegisterSchema,
  type CandidateRegisterValues,
} from "../schemas";
import { applyApiError, useApiErrorLocalizer, useFormError } from "../useAuthForm";
import { PasswordInput } from "./PasswordInput";

const STEPS = ["account", "profile", "preferences", "ready"] as const;
type Step = (typeof STEPS)[number];

const CANDIDATE_FIELDS = [
  "full_name",
  "email",
  "password",
  "phone",
  "preferred_job_title",
  "preferred_location",
  "preferred_employment_type",
] as const;

/**
 * Candidate registration stepper (spec §14.7). Steps: account -> basic profile
 * -> preferences -> done. A single react-hook-form holds the whole form;
 * "Next" validates only the current step's fields, and the final step submits
 * `registerCandidate`. On success the candidate session is set and we redirect
 * role-aware to the candidate dashboard (ADR-0001 §4.1). CSRF primed before the
 * POST. Inline + form-level errors map from the API envelope.
 */
export function CandidateRegisterStepper() {
  const t = useTranslations("auth.candidateRegister");
  const tType = useTranslations("jobs.employmentType");
  const tActions = useTranslations("common.actions");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuth();
  const { formError, setFormError } = useFormError();
  const localizeError = useApiErrorLocalizer({ includeAuthCopy: true });
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CandidateRegisterValues>({
    resolver: zodResolver(candidateRegisterSchema((key) => tv(key))),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      preferred_job_title: "",
      preferred_location: "",
      preferred_employment_type: "",
    },
  });

  const current: Step = STEPS[step];

  const goNext = async () => {
    const fields = CANDIDATE_STEP_FIELDS[
      current as keyof typeof CANDIDATE_STEP_FIELDS
    ];
    const valid = await trigger(fields, { shouldFocus: true });
    if (valid) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await ensureCsrf(locale);
      const user = await registerCandidate(
        {
          full_name: values.full_name,
          email: values.email,
          password: values.password,
          phone: values.phone,
          preferred_job_title: values.preferred_job_title,
          preferred_location: values.preferred_location || undefined,
          preferred_employment_type:
            values.preferred_employment_type || undefined,
          preferred_locale: locale,
        },
        locale,
      );
      setUser(user);
      // Advance to the success step; the dashboard CTA performs the redirect,
      // and we also auto-route so the candidate lands in their workspace.
      setStep(STEPS.indexOf("ready"));
      router.replace(destinationForUser(user));
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        CANDIDATE_FIELDS,
        tv("generic"),
        localizeError,
      );
      if (message) setFormError(message);
      // Surface field errors on their owning step (account holds credentials).
      setStep(0);
    }
  });

  return (
    <Card className="flex flex-col gap-6">
      {/* Progress indicator */}
      <ol className="flex flex-wrap gap-2" aria-label={t("stepLabel")}>
        {STEPS.map((key, index) => {
          const state =
            index === step ? "current" : index < step ? "done" : "upcoming";
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold",
                  state === "current" &&
                    "bg-brand-primary text-brand-on-primary",
                  state === "done" &&
                    "bg-brand-primary-soft text-brand-primary-strong",
                  state === "upcoming" && "bg-surface-subtle text-text-muted",
                )}
              >
                <span aria-hidden="true">{index + 1}</span>
                {t(`steps.${key}`)}
              </span>
            </li>
          );
        })}
      </ol>

      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        {current === "account" && (
          <div className="flex flex-col gap-4">
            <Field
              label={t("fields.fullName")}
              required
              error={errors.full_name?.message}
            >
              <Input autoComplete="name" {...register("full_name")} />
            </Field>
            <Field
              label={t("fields.email")}
              required
              error={errors.email?.message}
            >
              <Input type="email" autoComplete="email" {...register("email")} />
            </Field>
            <Field
              label={t("fields.password")}
              hint={t("fields.passwordHint")}
              required
              error={errors.password?.message}
            >
              <PasswordInput
                autoComplete="new-password"
                {...register("password")}
              />
            </Field>
          </div>
        )}

        {current === "profile" && (
          <div className="flex flex-col gap-4">
            <Field
              label={t("fields.phone")}
              required
              error={errors.phone?.message}
            >
              <Input type="tel" autoComplete="tel" {...register("phone")} />
            </Field>
            <Field
              label={t("fields.preferredRole")}
              required
              error={errors.preferred_job_title?.message}
            >
              <Input {...register("preferred_job_title")} />
            </Field>
          </div>
        )}

        {current === "preferences" && (
          <div className="flex flex-col gap-4">
            <Field
              label={t("fields.preferredLocation")}
              hint={t("fields.preferredLocationHint")}
              error={errors.preferred_location?.message}
            >
              <Input {...register("preferred_location")} />
            </Field>
            <Field
              label={t("fields.preferredType")}
              hint={t("fields.preferredTypeHint")}
              error={errors.preferred_employment_type?.message}
            >
              <Select defaultValue="" {...register("preferred_employment_type")}>
                <option value="">—</option>
                <option value="fullTime">{tType("fullTime")}</option>
                <option value="partTime">{tType("partTime")}</option>
                <option value="contract">{tType("contract")}</option>
                <option value="internship">{tType("internship")}</option>
                <option value="temporary">{tType("temporary")}</option>
              </Select>
            </Field>
          </div>
        )}

        {current === "ready" && (
          <SuccessState
            icon="✓"
            title={t("ready.title")}
            description={t("ready.body")}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/candidate/dashboard" size="sm">
                  {t("ready.goToDashboard")}
                </LinkButton>
                <LinkButton href="/jobs" variant="secondary" size="sm">
                  {t("ready.browseJobs")}
                </LinkButton>
              </div>
            }
          />
        )}

        {/* Navigation */}
        {current !== "ready" && (
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={step === 0 || isSubmitting}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              {tActions("back")}
            </Button>
            {current === "preferences" ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("submitting") : t("submit")}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                {tActions("next")}
              </Button>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}
