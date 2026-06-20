"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  SuccessState,
  Textarea,
} from "@/components/ui";

/**
 * Career support request form shell (spec §14.5). Demonstrates the success
 * state on submit (no real API this phase — submission is intercepted and the
 * success block is shown). Privacy notice and response expectation are present.
 */
export function SupportFormShell() {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <SuccessState
        title={t("success.title")}
        description={t("success.body")}
        icon="✓"
        action={
          <Button variant="secondary" onClick={() => setSubmitted(false)}>
            {tCommon("actions.back")}
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="type-heading-3 text-text-primary">{t("form.title")}</h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.name")} required>
            <Input autoComplete="name" />
          </Field>
          <Field label={t("form.email")} required>
            <Input type="email" autoComplete="email" />
          </Field>
        </div>
        <Field label={t("form.category")} required>
          <Select defaultValue="">
            <option value="" disabled>
              {t("form.categoryPlaceholder")}
            </option>
            <option value="application">{t("form.categories.application")}</option>
            <option value="resume">{t("form.categories.resume")}</option>
            <option value="career">{t("form.categories.career")}</option>
            <option value="status">{t("form.categories.status")}</option>
            <option value="other">{t("form.categories.other")}</option>
          </Select>
        </Field>
        <Field label={t("form.message")} hint={t("form.messageHint")}>
          <Textarea rows={5} />
        </Field>
        <Field label={t("form.resume")} hint={t("form.resumeHint")}>
          <Input type="file" accept=".pdf,.docx" className="py-2.5" />
        </Field>
        <Alert tone="info">{t("form.privacyNotice")}</Alert>
        <div>
          <Button type="submit">{t("form.submit")}</Button>
        </div>
      </form>
    </Card>
  );
}
