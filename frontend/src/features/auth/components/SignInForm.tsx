"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
} from "@/components/ui";

import { PasswordInput } from "./PasswordInput";

/**
 * Sign-in form shell (spec §14.6). One authentication form for all roles —
 * role-aware redirect happens server-side after Phase 2. Submission is inert
 * this phase; an honest notice explains that.
 */
export function SignInForm() {
  const t = useTranslations("auth.signIn");

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="type-heading-2 text-text-primary">{t("title")}</h2>
        <p className="type-body-sm text-text-secondary">{t("lead")}</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <Field label={t("email")} required>
          <Input type="email" autoComplete="email" />
        </Field>
        <Field label={t("password")} required>
          <PasswordInput autoComplete="current-password" />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Checkbox id="remember-me" label={t("rememberMe")} />
          <Link
            href="/sign-in"
            className="type-body-sm text-brand-primary no-underline hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <Button type="submit" fullWidth>
          {t("submit")}
        </Button>
      </form>
      <Alert tone="info">{t("shellNote")}</Alert>
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
