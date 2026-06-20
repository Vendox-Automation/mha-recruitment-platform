"use client";

import { useTranslations } from "next-intl";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

/**
 * Job creation / edit form shell (spec §14.11). Required fields, salary
 * structure with "do not disclose", and the job action set (save draft /
 * preview / publish). Inert this phase; job creation is wired in Phase 4.
 */
export function JobFormShell() {
  const t = useTranslations("employer.newJob");
  const tType = useTranslations("jobs.employmentType");

  return (
    <Card className="flex flex-col gap-5">
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Field label={t("fields.jobTitle")} required>
          <Input />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.location")} required>
            <Input />
          </Field>
          <Field label={t("fields.employmentType")} required>
            <Select defaultValue="fullTime">
              <option value="fullTime">{tType("fullTime")}</option>
              <option value="partTime">{tType("partTime")}</option>
              <option value="contract">{tType("contract")}</option>
              <option value="internship">{tType("internship")}</option>
              <option value="temporary">{tType("temporary")}</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.salaryMin")}>
            <Input type="number" inputMode="numeric" min={0} />
          </Field>
          <Field label={t("fields.salaryMax")}>
            <Input type="number" inputMode="numeric" min={0} />
          </Field>
        </div>
        <Checkbox id="salary-undisclosed" label={t("fields.salaryUndisclosed")} />
        <Field label={t("fields.description")} required>
          <Textarea rows={6} />
        </Field>
        <Field label={t("fields.requirements")} required>
          <Textarea rows={5} />
        </Field>
        <Field label={t("fields.deadline")}>
          <Input type="date" />
        </Field>

        <Alert tone="info">{t("shellNote")}</Alert>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t("actions.publish")}</Button>
          <Button type="button" variant="secondary">
            {t("actions.preview")}
          </Button>
          <Button type="button" variant="ghost">
            {t("actions.saveDraft")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
