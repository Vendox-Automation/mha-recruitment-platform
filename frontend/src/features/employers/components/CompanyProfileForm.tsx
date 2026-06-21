"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  SuccessState,
  Textarea,
} from "@/components/ui";
import { applyApiError, useFormError } from "@/features/auth/useAuthForm";
import { useAuth } from "@/lib/auth";

import {
  EMPLOYER_PROFILE_FIELDS,
  employerProfileSchema,
  type EmployerProfileValues,
} from "../schemas";
import { updateEmployerProfile } from "../service";
import type { EmployerProfile } from "../types";

const COMPANY_SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

/** Map an API profile onto react-hook-form values (null → empty string). */
function toFormValues(profile: EmployerProfile): EmployerProfileValues {
  return {
    company_name: profile.company_name ?? "",
    contact_person: profile.contact_person ?? "",
    phone: profile.phone ?? "",
    company_summary: profile.company_summary ?? "",
    website: profile.website ?? "",
    industry: profile.industry ?? "",
    company_size: profile.company_size ?? "",
    company_location: profile.company_location ?? "",
    culture_text: profile.culture_text ?? "",
    benefits_text: profile.benefits_text ?? "",
  };
}

export interface CompanyProfileFormProps {
  /** The current profile, used to seed the form. */
  profile: EmployerProfile;
  /**
   * Submit label override. Defaults to "Save changes"; the rejected/resubmit
   * flow passes its own "Update and resubmit" label (spec §14.8 rejection).
   */
  submitLabel?: string;
  /** Called with the fresh profile after a successful PATCH. */
  onSaved?: (profile: EmployerProfile) => void;
}

/**
 * Company-profile edit form (spec §14.4/§14.10 company page, §14.8 allowed
 * edits). Submits the allowed company fields via PATCH /employer/profile/;
 * approval fields are never part of the schema so they can never be sent
 * (Django owns approval, CLAUDE.md §10).
 *
 * States: inline field errors mapped from `ApiRequestError.fields`, a
 * form-level error for envelope/non-field messages, a disabled in-flight submit
 * button, and a dismissible success confirmation (CLAUDE.md required states).
 * Used by both the approved company-profile screen and the pending/rejected
 * correct-and-resubmit affordance.
 */
export function CompanyProfileForm({
  profile,
  submitLabel,
  onSaved,
}: CompanyProfileFormProps) {
  const t = useTranslations("employer.companyProfile");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const { refetch } = useAuth();
  const { formError, setFormError } = useFormError();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<EmployerProfileValues>({
    resolver: zodResolver(employerProfileSchema((key) => tv(key))),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await updateEmployerProfile(values, locale);
      // Reset to the saved values so the form is no longer "dirty" and the
      // success state reflects exactly what the server stored.
      reset(toFormValues(updated));
      // The /auth/me/ payload carries approval_status; a profile edit may not
      // change it, but refetching keeps the cached session consistent.
      await refetch();
      onSaved?.(updated);
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        EMPLOYER_PROFILE_FIELDS,
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
          {t("sections.identity")}
        </legend>
        <Field
          label={t("fields.companyName")}
          required
          error={errors.company_name?.message}
        >
          <Input autoComplete="organization" {...register("company_name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("fields.contactPerson")}
            required
            error={errors.contact_person?.message}
          >
            <Input autoComplete="name" {...register("contact_person")} />
          </Field>
          <Field
            label={t("fields.phone")}
            required
            error={errors.phone?.message}
          >
            <Input type="tel" autoComplete="tel" {...register("phone")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="type-label text-text-primary">
          {t("sections.public")}
        </legend>
        <Field
          label={t("fields.companySummary")}
          hint={t("fields.companySummaryHint")}
          error={errors.company_summary?.message}
        >
          <Textarea rows={5} {...register("company_summary")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("fields.website")}
            hint={t("fields.websiteHint")}
            error={errors.website?.message}
          >
            <Input
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              {...register("website")}
            />
          </Field>
          <Field label={t("fields.industry")} error={errors.industry?.message}>
            <Input {...register("industry")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("fields.companySize")}
            error={errors.company_size?.message}
          >
            <Select {...register("company_size")}>
              <option value="">{t("fields.companySizeUnset")}</option>
              {COMPANY_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {t("companySize", { range: size })}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t("fields.companyLocation")}
            error={errors.company_location?.message}
          >
            <Input
              autoComplete="address-level2"
              {...register("company_location")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="type-label text-text-primary">
          {t("sections.cultureBenefits")}
        </legend>
        <Field
          label={t("fields.culture")}
          hint={t("fields.cultureHint")}
          error={errors.culture_text?.message}
        >
          <Textarea rows={4} {...register("culture_text")} />
        </Field>
        <Field
          label={t("fields.benefits")}
          hint={t("fields.benefitsHint")}
          error={errors.benefits_text?.message}
        >
          <Textarea rows={4} {...register("benefits_text")} />
        </Field>
      </fieldset>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : (submitLabel ?? t("save"))}
        </Button>
      </div>
    </form>
  );
}
