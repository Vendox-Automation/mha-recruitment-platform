"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  SuccessState,
  Textarea,
} from "@/components/ui";
import {
  applyApiError,
  useApiErrorLocalizer,
  useFormError,
} from "@/features/auth/useAuthForm";
import { ApiRequestError } from "@/lib/api/client";

import { companyReviewsRootKey } from "../queryKeys";
import { reviewSchema, type ReviewValues } from "../schemas";
import { createCompanyReview } from "../service";
import type { CreateReviewInput, Rating } from "../types";
import { RatingInput } from "./StarRating";

/** RHF-mappable fields a server 400 can target. */
const REVIEW_FIELDS = [
  "reviewer_name",
  "reviewer_email",
  "rating",
  "title",
  "body",
] as const;

export interface ReviewFormProps {
  companySlug: string;
  /** Invalidates the company detail (average + distribution) after a submit. */
  onSubmitted?: () => void;
}

/**
 * Google-style review form: anyone can post with a NAME + EMAIL (no account).
 * Name, email, and a 1–5 rating are required; title and body are optional. The
 * email is collected for moderation only and is never shown publicly (the label
 * says so). On success the form clears and a confirmation replaces it, and the
 * reviews list + company summary are invalidated.
 *
 * Errors: zod handles client validation; a server 400 maps `fields` to inline
 * errors; a 429 (throttled) surfaces a friendly "try again later" alert.
 *
 * Accessibility: every control has a `<label>` via {@link Field}; the rating is
 * a keyboard-operable radio group; inline errors are associated and the submit
 * disables while in flight.
 */
export function ReviewForm({ companySlug, onSubmitted }: ReviewFormProps) {
  const t = useTranslations("reviews");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { formError, setFormError } = useFormError();
  const localizeError = useApiErrorLocalizer();
  const [submitted, setSubmitted] = useState(false);
  const ratingErrorId = useId();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema((key) => tv(key))),
    defaultValues: {
      reviewer_name: "",
      reviewer_email: "",
      rating: 0 as unknown as ReviewValues["rating"],
      title: "",
      body: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ReviewValues) => {
      const input: CreateReviewInput = {
        reviewer_name: values.reviewer_name,
        reviewer_email: values.reviewer_email,
        rating: values.rating as Rating,
        title: values.title || undefined,
        body: values.body || undefined,
      };
      return createCompanyReview(companySlug, input, locale);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: companyReviewsRootKey(companySlug),
      });
      onSubmitted?.();
      setSubmitted(true);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values, {
      onError: (error) => {
        // Throttling: friendly "you have reviewed recently, try again later".
        if (error instanceof ApiRequestError && error.status === 429) {
          setFormError(t("form.throttled"));
          return;
        }
        const message = applyApiError(
          error,
          setError,
          REVIEW_FIELDS,
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
        title={t("form.successTitle")}
        description={t("form.successBody")}
        icon="✓"
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSubmitted(false);
              reset();
              mutation.reset();
            }}
          >
            {t("form.again")}
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <h3 className="type-heading-3 text-text-primary">{t("form.title")}</h3>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <Field
            label={t("form.name")}
            required
            error={errors.reviewer_name?.message}
          >
            <Input autoComplete="name" {...register("reviewer_name")} />
          </Field>
          <Field
            label={t("form.email")}
            required
            hint={t("form.emailHint")}
            hintPosition="bottom"
            error={errors.reviewer_email?.message}
          >
            <Input type="email" autoComplete="email" {...register("reviewer_email")} />
          </Field>
        </div>

        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="type-label text-text-primary">
                {t("form.rating")}{" "}
                <span className="text-status-danger" aria-hidden="true">
                  *
                </span>
              </span>
              <RatingInput
                value={Number(field.value) || 0}
                onChange={(rating) => field.onChange(rating)}
                legend={t("form.ratingLegend")}
                optionLabel={(rating) => t("outOfFive", { rating })}
                invalid={Boolean(errors.rating)}
                describedById={errors.rating ? ratingErrorId : undefined}
              />
              {errors.rating ? (
                <p id={ratingErrorId} role="alert" className="type-body-sm text-status-danger">
                  {errors.rating.message}
                </p>
              ) : null}
            </div>
          )}
        />

        <Field label={t("form.reviewTitle")} error={errors.title?.message}>
          <Input {...register("title")} />
        </Field>
        <Field
          label={t("form.body")}
          hint={t("form.bodyHint")}
          error={errors.body?.message}
        >
          <Textarea rows={4} {...register("body")} />
        </Field>

        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <div>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending
              ? t("form.submitting")
              : t("form.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
