"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { applyApiError, useFormError } from "@/features/auth/useAuthForm";

import {
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_FORM_FIELDS,
  SALARY_PERIOD_OPTIONS,
  SUPPORTED_CURRENCIES,
  emptyJobFormValues,
  jobFormSchema,
  jobFormValuesToWrite,
  jobToFormValues,
  type JobFormValues,
} from "../employerSchema";
import { createJob, updateJob } from "../employerService";
import type { EmployerJob } from "../employerTypes";
import { ScreeningQuestionsEditor } from "./ScreeningQuestionsEditor";

export interface JobFormProps {
  /** Edit mode when a job is supplied; create mode otherwise. */
  job?: EmployerJob;
  /** Called with the saved job after a successful create/update. */
  onSaved: (job: EmployerJob) => void;
}

/**
 * Reusable employer job form for create + edit (spec §14.11). Backed by
 * react-hook-form + zod (`employerSchema`). Required fields, the full salary
 * structure with a "salary not disclosed" toggle that disables and clears the
 * figures, application deadline, listing language, and the nested
 * {@link ScreeningQuestionsEditor}.
 *
 * States (CLAUDE.md required set): inline field errors mapped from
 * `ApiRequestError.fields`, a form-level error for envelope/non-field messages,
 * and a disabled in-flight submit button. On success it calls `onSaved` — the
 * page decides where to route (create → job detail; edit → stay/confirm).
 *
 * Django stays authoritative: client zod mirrors the server rules (required
 * fields, salary_min ≤ salary_max) but the server re-validates and, e.g.,
 * refuses publishing a past-deadline job — that happens on the detail screen,
 * not here, since this form only saves a DRAFT/edits, never publishes.
 */
export function JobForm({ job, onSaved }: JobFormProps) {
  const t = useTranslations("employer.jobForm");
  const tType = useTranslations("jobs.employmentType");
  const tPeriod = useTranslations("employer.jobForm.period");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const { formError, setFormError } = useFormError();

  const methods = useForm<JobFormValues>({
    // zod's transform widens output types; cast keeps RHF's generic happy.
    resolver: zodResolver(jobFormSchema((key) => tv(key))) as never,
    defaultValues: job ? jobToFormValues(job) : emptyJobFormValues(locale),
  });

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = methods;

  const salaryDisclosed = useWatch({ control, name: "salary_disclosed" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const payload = jobFormValuesToWrite(values);
      const saved = job
        ? await updateJob(job.id, payload, locale)
        : await createJob(payload, locale);
      onSaved(saved);
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        JOB_FORM_FIELDS,
        tv("generic"),
      );
      if (message) setFormError(message);
    }
  });

  return (
    <FormProvider {...methods}>
      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="type-label text-text-primary">
            {t("sections.role")}
          </legend>
          <Field label={t("fields.title")} required error={errors.title?.message}>
            <Input {...register("title")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.location")}
              required
              error={errors.location?.message}
            >
              <Input autoComplete="address-level2" {...register("location")} />
            </Field>
            <Field
              label={t("fields.employmentType")}
              required
              error={errors.employment_type?.message}
            >
              <Select {...register("employment_type")}>
                {EMPLOYMENT_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {tType(employmentTypeKey(value))}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="type-label text-text-primary">
            {t("sections.salary")}
          </legend>
          <Checkbox
            id="salary-undisclosed"
            label={t("fields.salaryUndisclosed")}
            hint={t("fields.salaryUndisclosedHint")}
            // The form holds `salary_disclosed`; the toggle is its inverse.
            checked={!salaryDisclosed}
            onChange={(e) =>
              methods.setValue("salary_disclosed", !e.target.checked, {
                shouldValidate: true,
              })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("fields.salaryMin")} error={errors.salary_min?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                disabled={!salaryDisclosed}
                {...register("salary_min")}
              />
            </Field>
            <Field label={t("fields.salaryMax")} error={errors.salary_max?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                disabled={!salaryDisclosed}
                {...register("salary_max")}
              />
            </Field>
            <Field label={t("fields.currency")}>
              <Select disabled={!salaryDisclosed} {...register("salary_currency")}>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("fields.period")}>
              <Select disabled={!salaryDisclosed} {...register("salary_period")}>
                {SALARY_PERIOD_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {tPeriod(value)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-0 p-0">
          <legend className="type-label text-text-primary">
            {t("sections.detail")}
          </legend>
          <Field
            label={t("fields.description")}
            required
            error={errors.description?.message}
          >
            <Textarea rows={6} {...register("description")} />
          </Field>
          <Field
            label={t("fields.requirements")}
            required
            error={errors.requirements?.message}
          >
            <Textarea rows={5} {...register("requirements")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("fields.deadline")}
              hint={t("fields.deadlineHint")}
              error={errors.application_deadline?.message}
            >
              <Input type="date" {...register("application_deadline")} />
            </Field>
            <Field
              label={t("fields.listingLanguage")}
              hint={t("fields.listingLanguageHint")}
            >
              <Select {...register("listing_language")}>
                <option value="en">{t("language.en")}</option>
                <option value="zh-CN">{t("language.zhCN")}</option>
              </Select>
            </Field>
          </div>
        </fieldset>

        <ScreeningQuestionsEditor />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("saving")
              : job
                ? t("saveChanges")
                : t("createDraft")}
          </Button>
          <p className="type-caption">
            {job ? t("editNote") : t("createNote")}
          </p>
        </div>
      </form>
    </FormProvider>
  );
}

/** Map a backend employment-type code to its `jobs.employmentType` i18n key. */
function employmentTypeKey(code: string): string {
  const map: Record<string, string> = {
    FULL_TIME: "fullTime",
    PART_TIME: "partTime",
    CONTRACT: "contract",
    INTERNSHIP: "internship",
    TEMPORARY: "temporary",
  };
  return map[code] ?? "fullTime";
}
