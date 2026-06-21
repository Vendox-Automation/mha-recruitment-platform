/**
 * Career-support form schema (ADR-0001 §1.2 react-hook-form + zod). Messages are
 * message-driven via a translator bound to the `validation` namespace so copy
 * stays bilingual and in one place. These are client-side UX checks only —
 * Django remains authoritative (the attachment in particular is sniffed
 * server-side); the rules here are deliberately light (presence + basic shape).
 */

import { z } from "zod";

import type { SupportCategory } from "./types";

export type ValidationTranslator = (key: string) => string;

const CATEGORY_VALUES: readonly [SupportCategory, ...SupportCategory[]] = [
  "JOB_APPLICATION",
  "RESUME",
  "CAREER_DIRECTION",
  "APPLICATION_STATUS",
  "OTHER",
];

export function supportSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().trim().min(1, { message: t("required") }),
    email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("email") }),
    // Phone is optional on the backend; keep it optional here too.
    phone: z.string().trim().optional(),
    category: z.enum(CATEGORY_VALUES, { message: t("required") }),
    message: z.string().trim().min(1, { message: t("required") }),
  });
}

export type SupportValues = z.infer<ReturnType<typeof supportSchema>>;
