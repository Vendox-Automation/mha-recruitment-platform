"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
import {
  applyApiError,
  useApiErrorLocalizer,
  useFormError,
} from "@/features/auth/useAuthForm";
import {
  RESUME_ACCEPT,
  precheckResumeFile,
} from "@/features/candidates/resumeFile";
import { ApiRequestError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

import { supportRequestsKey } from "../queryKeys";
import { supportSchema, type SupportValues } from "../schemas";
import { createSupportRequest } from "../service";
import { SUPPORT_CATEGORIES, categoryKey } from "../support";
import type { SupportRequest } from "../types";

/**
 * Known server-mappable form fields. The attachment is not a RHF field, so a
 * server `file` error is routed to the file-error state separately (see
 * {@link SupportForm}).
 */
const SUPPORT_FIELDS = [
  "name",
  "email",
  "phone",
  "category",
  "message",
] as const;

/**
 * Career-support request form (spec §14.5). Used by guests AND signed-in
 * candidates (the endpoint is `AllowAny`); when a candidate is signed in their
 * name/email are prefilled from `/auth/me`. An optional private attachment is
 * sent as multipart (ADR-0001 §5 — never a public URL).
 *
 * On success a candidate's history cache is invalidated so their `/candidate/
 * support` list reflects the new request immediately.
 *
 * Accessibility: every control has a `<label>` via {@link Field}; inline field
 * errors and a form-level alert are mapped from the API envelope; the submit
 * button disables while in flight; the success confirmation replaces the form.
 */
export function SupportForm({ jobSlug }: { jobSlug?: string }) {
  const t = useTranslations("support");
  const tv = useTranslations("validation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formError, setFormError } = useFormError();
  const localizeError = useApiErrorLocalizer();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const prefillName =
    typeof user?.profile?.full_name === "string" ? user.profile.full_name : "";
  const prefillEmail = user?.email ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupportValues>({
    resolver: zodResolver(supportSchema((key) => tv(key))),
    defaultValues: {
      name: prefillName,
      email: prefillEmail,
      phone: "",
      // Force a deliberate choice — there is no sensible default category.
      category: undefined as unknown as SupportValues["category"],
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SupportValues) =>
      createSupportRequest(
        { ...values, job: jobSlug, file: selectedFile },
        locale,
      ),
    onSuccess: (created: SupportRequest) => {
      // Refresh the candidate's own history if they are signed in.
      void queryClient.invalidateQueries({
        queryKey: supportRequestsKey(locale),
      });
      void created;
      setSubmitted(true);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setFileError(null);

    // Client-side attachment pre-check (server stays authoritative).
    if (selectedFile) {
      const result = precheckResumeFile(selectedFile);
      if (!result.ok && result.error) {
        setFileError(tv(result.error));
        return;
      }
    }

    mutation.mutate(values, {
      onError: (error) => {
        // A server-side attachment rejection keys on `file` (it is not a RHF
        // field), so surface it on the file input rather than the form alert.
        if (
          error instanceof ApiRequestError &&
          error.fields?.file?.length
        ) {
          setFileError(error.fields.file.join(" "));
        }
        const message = applyApiError(
          error,
          setError,
          SUPPORT_FIELDS,
          tv("generic"),
          localizeError,
        );
        if (message) setFormError(message);
      },
    });
  });

  if (submitted) {
    return (
      <SuccessState
        title={t("success.title")}
        description={t("success.body")}
        icon="✓"
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSubmitted(false);
              mutation.reset();
            }}
          >
            {t("success.again")}
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="type-heading-3 text-text-primary">{t("form.title")}</h2>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("form.name")}
            required
            error={errors.name?.message}
          >
            <Input autoComplete="name" {...register("name")} />
          </Field>
          <Field
            label={t("form.email")}
            required
            error={errors.email?.message}
          >
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
        </div>
        <Field
          label={t("form.phone")}
          hint={t("form.phoneHint")}
          error={errors.phone?.message}
        >
          <Input type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field
          label={t("form.category")}
          required
          error={errors.category?.message}
        >
          <Select defaultValue="" {...register("category")}>
            <option value="" disabled>
              {t("form.categoryPlaceholder")}
            </option>
            {SUPPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`form.categories.${categoryKey(category)}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t("form.message")}
          required
          hint={t("form.messageHint")}
          error={errors.message?.message}
        >
          <Textarea rows={5} {...register("message")} />
        </Field>
        <Field
          label={t("form.resume")}
          hint={t("form.resumeHint")}
          error={fileError ?? undefined}
        >
          <Input
            type="file"
            accept={RESUME_ACCEPT}
            className="py-2.5"
            onChange={(event) => {
              setFileError(null);
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
          />
        </Field>
        <Alert tone="info">{t("form.privacyNotice")}</Alert>
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <div>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending
              ? t("form.submitting")
              : t("form.submit")}
          </Button>
        </div>
        <p className="sr-only" aria-hidden="true">
          {tCommon("states.loadingSpinner")}
        </p>
      </form>
    </Card>
  );
}
