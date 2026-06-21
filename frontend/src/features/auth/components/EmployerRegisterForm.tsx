"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { useRouter } from "@/i18n/navigation";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { ensureCsrf, registerEmployer } from "@/lib/api/auth";
import { destinationForUser, useAuth } from "@/lib/auth";

import {
  employerRegisterSchema,
  type EmployerRegisterValues,
} from "../schemas";
import { applyApiError, useApiErrorLocalizer, useFormError } from "../useAuthForm";
import { PasswordInput } from "./PasswordInput";

const EMPLOYER_FIELDS = [
  "company_name",
  "email",
  "password",
  "contact_person",
  "phone",
] as const;

/**
 * Employer registration (spec §14.8). Submits company details for MHA review;
 * on success the account is PENDING, so the role-aware redirect lands on
 * `/employer/pending` (ADR-0001 §4.1, spec §8.3). CSRF primed before the POST;
 * inline + form-level errors from the API envelope; submit disables in flight.
 */
export function EmployerRegisterForm() {
  const t = useTranslations("auth.employerRegister");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuth();
  const { formError, setFormError } = useFormError();
  const localizeError = useApiErrorLocalizer({ includeAuthCopy: true });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployerRegisterValues>({
    resolver: zodResolver(employerRegisterSchema((key) => tv(key))),
    defaultValues: {
      company_name: "",
      email: "",
      password: "",
      contact_person: "",
      phone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await ensureCsrf(locale);
      const user = await registerEmployer(
        { ...values, preferred_locale: locale },
        locale,
      );
      setUser(user);
      router.replace(destinationForUser(user));
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        EMPLOYER_FIELDS,
        tv("generic"),
        localizeError,
      );
      if (message) setFormError(message);
    }
  });

  return (
    <Card className="flex flex-col gap-5">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <Field
          label={t("fields.companyName")}
          required
          error={errors.company_name?.message}
        >
          <Input autoComplete="organization" {...register("company_name")} />
        </Field>
        <Field
          label={t("fields.workEmail")}
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
          <PasswordInput autoComplete="new-password" {...register("password")} />
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
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
