/**
 * Review form schema (ADR-0001 §1.2 react-hook-form + zod). Messages are
 * message-driven via a translator bound to the `validation` namespace so copy
 * stays bilingual and in one place. These are client-side UX checks only —
 * Django remains authoritative.
 *
 * Google-style intake: a NAME, an EMAIL (collected, never shown publicly), and
 * a RATING (1–5) are required; a title and body are optional.
 */

import { z } from "zod";

export type ValidationTranslator = (key: string) => string;

export function reviewSchema(t: ValidationTranslator) {
  return z.object({
    reviewer_name: z.string().trim().min(1, { message: t("required") }),
    reviewer_email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("email") }),
    // 0 is the "no selection" sentinel; require a real 1–5 star choice.
    rating: z
      .number({ message: t("required") })
      .int()
      .min(1, { message: t("required") })
      .max(5, { message: t("required") }),
    title: z.string().trim().optional(),
    body: z.string().trim().optional(),
  });
}

export type ReviewValues = z.infer<ReturnType<typeof reviewSchema>>;
