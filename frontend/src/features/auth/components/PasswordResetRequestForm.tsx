"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Link } from "@/i18n/navigation";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  SuccessState,
} from "@/components/ui";
import { ensureCsrf, requestPasswordReset } from "@/lib/api/auth";

import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from "../schemas";
import { applyApiError, useFormError } from "../useAuthForm";

const FIELDS = ["email"] as const;

/**
 * Password-reset request (spec §14.6). The backend always returns 200 to avoid
 * account enumeration, so on a successful request we show a neutral "check your
 * email" confirmation regardless of whether the address exists. CSRF is primed
 * before the POST. Reset CONFIRM (token-bearing) is deferred — see report.
 */
export function PasswordResetRequestForm() {
  const t = useTranslations("auth.passwordReset");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const { formError, setFormError } = useFormError();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema((key) => tv(key))),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await ensureCsrf(locale);
      await requestPasswordReset(values, locale);
    } catch (error) {
      const message = applyApiError(error, setError, FIELDS, tv("generic"));
      if (message) setFormError(message);
      // Re-throw so react-hook-form marks the submit unsuccessful and keeps the
      // form visible for a retry.
      throw error;
    }
  });

  if (isSubmitSuccessful) {
    return (
      <Card className="flex flex-col gap-5">
        <SuccessState
          icon="✓"
          title={t("sentTitle")}
          description={t("sentBody")}
          action={
            <Link
              href="/sign-in"
              className="type-body-sm text-brand-primary no-underline hover:underline"
            >
              {t("backToSignIn")}
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="type-heading-2 text-text-primary">{t("title")}</h2>
        <p className="type-body-sm text-text-secondary">{t("lead")}</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <Field label={t("email")} required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
      <p className="type-body-sm text-text-secondary">
        <Link
          href="/sign-in"
          className="text-brand-primary no-underline hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </Card>
  );
}
