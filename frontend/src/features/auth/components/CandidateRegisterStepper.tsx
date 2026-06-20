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
} from "@/components/ui";
import { LinkButton } from "@/components/ui";
import { cn } from "@/lib/cn";

import { PasswordInput } from "./PasswordInput";

const STEPS = ["account", "profile", "preferences", "resume", "ready"] as const;

/**
 * Candidate registration stepper shell (spec §14.7). Five steps with a progress
 * indicator, inline-validation-ready fields, and a success screen. Navigation
 * is local-only this phase (no submission); the final step shows the "ready"
 * success state with next actions. Keyboard accessible.
 */
export function CandidateRegisterStepper() {
  const t = useTranslations("auth.candidateRegister");
  const tType = useTranslations("jobs.employmentType");
  const tActions = useTranslations("common.actions");
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Card className="flex flex-col gap-6">
      {/* Progress indicator */}
      <ol className="flex flex-wrap gap-2" aria-label={t("stepLabel")}>
        {STEPS.map((key, index) => {
          const state =
            index === step
              ? "current"
              : index < step
                ? "done"
                : "upcoming";
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold",
                  state === "current" &&
                    "bg-brand-primary text-brand-on-primary",
                  state === "done" &&
                    "bg-brand-primary-soft text-brand-primary-strong",
                  state === "upcoming" &&
                    "bg-surface-subtle text-text-muted",
                )}
              >
                <span aria-hidden="true">{index + 1}</span>
                {t(`steps.${key}`)}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      {current === "account" && (
        <div className="flex flex-col gap-4">
          <Field label={t("fields.fullName")} required>
            <Input autoComplete="name" />
          </Field>
          <Field label={t("fields.email")} required>
            <Input type="email" autoComplete="email" />
          </Field>
          <Field
            label={t("fields.password")}
            hint={t("fields.passwordHint")}
            required
          >
            <PasswordInput autoComplete="new-password" />
          </Field>
        </div>
      )}

      {current === "profile" && (
        <div className="flex flex-col gap-4">
          <Field label={t("fields.phone")} required>
            <Input type="tel" autoComplete="tel" />
          </Field>
          <Field label={t("fields.preferredRole")} required>
            <Input />
          </Field>
        </div>
      )}

      {current === "preferences" && (
        <div className="flex flex-col gap-4">
          <Field
            label={t("fields.preferredLocation")}
            hint={t("fields.preferredLocationHint")}
          >
            <Input />
          </Field>
          <Field
            label={t("fields.preferredType")}
            hint={t("fields.preferredTypeHint")}
          >
            <Select defaultValue="">
              <option value="">—</option>
              <option value="fullTime">{tType("fullTime")}</option>
              <option value="partTime">{tType("partTime")}</option>
              <option value="contract">{tType("contract")}</option>
              <option value="internship">{tType("internship")}</option>
              <option value="temporary">{tType("temporary")}</option>
            </Select>
          </Field>
        </div>
      )}

      {current === "resume" && (
        <div className="flex flex-col gap-4">
          <Field label={t("fields.resume")} hint={t("fields.resumeHint")}>
            <Input type="file" accept=".pdf,.docx" className="py-2.5" />
          </Field>
        </div>
      )}

      {current === "ready" && (
        <SuccessState
          icon="✓"
          title={t("ready.title")}
          description={t("ready.body")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/jobs" size="sm">
                {t("ready.browseJobs")}
              </LinkButton>
              <LinkButton
                href="/candidate/dashboard"
                variant="secondary"
                size="sm"
              >
                {t("ready.goToDashboard")}
              </LinkButton>
            </div>
          }
        />
      )}

      {!isLast && <Alert tone="info">{t("shellNote")}</Alert>}

      {/* Navigation */}
      {!isLast && (
        <div className="flex justify-between gap-3">
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {tActions("back")}
          </Button>
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            {tActions("next")}
          </Button>
        </div>
      )}
    </Card>
  );
}
