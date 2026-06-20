"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  SuccessState,
} from "@/components/ui";
import { applyApiError, useFormError } from "@/features/auth/useAuthForm";

import {
  CANDIDATE_PROFILE_FIELDS,
  candidateProfileSchema,
  PREFERRED_EMPLOYMENT_TYPE_OPTIONS,
  type CandidateProfileValues,
} from "../schemas";
import { CANDIDATE_DASHBOARD_KEY, CANDIDATE_PROFILE_KEY } from "../queryKeys";
import { updateProfile } from "../service";
import type { CandidateProfile } from "../types";
import { employmentTypeKeyFor } from "../format";

/** Map an API profile onto react-hook-form values (null → empty string). */
function toFormValues(profile: CandidateProfile): CandidateProfileValues {
  return {
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    preferred_job_title: profile.preferred_job_title ?? "",
    preferred_location: profile.preferred_location ?? "",
    preferred_employment_type: profile.preferred_employment_type ?? "",
  };
}

export interface CandidateProfileFormProps {
  /** The current profile, used to seed the form. */
  profile: CandidateProfile;
  /** Called with the fresh profile after a successful PATCH. */
  onSaved?: (profile: CandidateProfile) => void;
}

/**
 * Candidate profile edit form (spec §14.7). Submits the editable basic + matching
 * preference fields via PATCH /candidate/profile/. Resume fields are not in the
 * schema, so a profile edit can never touch the resume (managed separately).
 *
 * States (CLAUDE.md required states): inline field errors mapped from
 * `ApiRequestError.fields`, a form-level error for envelope/non-field messages,
 * a disabled in-flight submit button, and a dismissible success confirmation.
 * On success the cached profile + dashboard queries are invalidated so the
 * completion indicator stays in sync.
 */
export function CandidateProfileForm({
  profile,
  onSaved,
}: CandidateProfileFormProps) {
  const t = useTranslations("candidate.profile");
  const tEmployment = useTranslations("jobs.employmentType");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { formError, setFormError } = useFormError();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CandidateProfileValues>({
    resolver: zodResolver(candidateProfileSchema((key) => tv(key))),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await updateProfile(values, locale);
      reset(toFormValues(updated));
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_PROFILE_KEY });
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_DASHBOARD_KEY });
      onSaved?.(updated);
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        CANDIDATE_PROFILE_FIELDS,
        tv("generic"),
      );
      if (message) setFormError(message);
    }
  });

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      {isSubmitSuccessful && !formError ? (
        <SuccessState
          compact
          title={t("savedTitle")}
          description={t("savedBody")}
        />
      ) : null}
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="type-label text-text-primary">
          {t("sections.basics")}
        </legend>
        <Field
          label={t("fields.fullName")}
          required
          error={errors.full_name?.message}
        >
          <Input autoComplete="name" {...register("full_name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.phone")} required error={errors.phone?.message}>
            <Input type="tel" autoComplete="tel" {...register("phone")} />
          </Field>
          <Field
            label={t("fields.preferredJobTitle")}
            required
            error={errors.preferred_job_title?.message}
          >
            <Input
              autoComplete="organization-title"
              {...register("preferred_job_title")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="type-label text-text-primary">
          {t("sections.preferences")}
        </legend>
        <p className="type-caption">{t("sections.preferencesHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("fields.preferredLocation")}
            error={errors.preferred_location?.message}
          >
            <Input
              autoComplete="address-level2"
              {...register("preferred_location")}
            />
          </Field>
          <Field
            label={t("fields.preferredEmploymentType")}
            error={errors.preferred_employment_type?.message}
          >
            <Select {...register("preferred_employment_type")}>
              <option value="">{t("fields.preferredEmploymentTypeAny")}</option>
              {PREFERRED_EMPLOYMENT_TYPE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {tEmployment(employmentTypeKeyFor(code))}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
