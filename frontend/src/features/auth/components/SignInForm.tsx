"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Link, useRouter } from "@/i18n/navigation";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { ensureCsrf, login } from "@/lib/api/auth";
import { ADMIN_URL, destinationForUser, isAdmin, useAuth } from "@/lib/auth";

import { signInSchema, type SignInValues } from "../schemas";
import { applyApiError, useApiErrorLocalizer, useFormError } from "../useAuthForm";
import { PasswordInput } from "./PasswordInput";

const SIGN_IN_FIELDS = ["email", "password"] as const;

/**
 * Sign-in form (spec §14.6). One authentication form for all roles; the
 * role-aware redirect happens after `/auth/me/` resolves (ADR-0001 §4.1). CSRF
 * is primed before the first POST. Inline field errors and a form-level error
 * are mapped from the normalised API envelope; the submit button disables while
 * the request is in flight.
 */
export function SignInForm() {
  const t = useTranslations("auth.signIn");
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
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema((key) => tv(key))),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await ensureCsrf(locale);
      const user = await login(values, locale);
      setUser(user);
      if (isAdmin(user)) {
        // Django Admin is a separate (Django-rendered) app — full-page load.
        window.location.assign(ADMIN_URL);
        return;
      }
      router.replace(destinationForUser(user));
    } catch (error) {
      const message = applyApiError(
        error,
        setError,
        SIGN_IN_FIELDS,
        tv("generic"),
        localizeError,
      );
      if (message) setFormError(message);
    }
  });

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
        <Field label={t("password")} required error={errors.password?.message}>
          <PasswordInput
            autoComplete="current-password"
            {...register("password")}
          />
        </Field>
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/forgot-password"
            className="type-body-sm text-brand-primary no-underline hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>
      <p className="type-body-sm text-text-secondary">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-brand-primary no-underline hover:underline"
        >
          {t("createAccount")}
        </Link>
      </p>
    </Card>
  );
}
