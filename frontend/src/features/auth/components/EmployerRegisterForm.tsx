"use client";

import { useTranslations } from "next-intl";

import { Alert, Button, Card, Field, Input } from "@/components/ui";

import { PasswordInput } from "./PasswordInput";

/**
 * Employer registration form shell (spec §14.8). Required company fields and a
 * clear explanation of the manual MHA approval process. Submission is inert this
 * phase (wired in Phases 2–3).
 */
export function EmployerRegisterForm() {
  const t = useTranslations("auth.employerRegister");

  return (
    <Card className="flex flex-col gap-5">
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Field label={t("fields.companyName")} required>
          <Input autoComplete="organization" />
        </Field>
        <Field label={t("fields.workEmail")} required>
          <Input type="email" autoComplete="email" />
        </Field>
        <Field
          label={t("fields.password")}
          hint={t("fields.passwordHint")}
          required
        >
          <PasswordInput autoComplete="new-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.contactPerson")} required>
            <Input autoComplete="name" />
          </Field>
          <Field label={t("fields.phone")} required>
            <Input type="tel" autoComplete="tel" />
          </Field>
        </div>
        <Alert tone="info">{t("shellNote")}</Alert>
        <div>
          <Button type="submit">{t("submit")}</Button>
        </div>
      </form>
    </Card>
  );
}
