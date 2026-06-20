import { z } from "zod";

import type { ValidationTranslator } from "@/features/auth/schemas";

/**
 * Employer company-profile form schema (ADR-0001 §1.2 react-hook-form + zod).
 * Validation messages are message-driven via a `validation`-bound translator so
 * copy stays bilingual and centralised (spec §14, §17.4). Client checks are UX
 * only — Django remains authoritative (spec §10), so rules are light: identity
 * + contact are required (spec §14.8); the public company fields are optional
 * and may be completed over time (data model: "may be completed later").
 *
 * `website` is validated leniently: empty is allowed, but a non-empty value
 * must look like a URL so candidates never see a broken link.
 */
export function employerProfileSchema(t: ValidationTranslator) {
  return z.object({
    company_name: z.string().trim().min(1, { message: t("required") }),
    contact_person: z.string().trim().min(1, { message: t("required") }),
    phone: z.string().trim().min(1, { message: t("required") }),
    company_summary: z.string().trim().optional(),
    website: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^https?:\/\/.+/i.test(value),
        { message: t("website") },
      ),
    industry: z.string().trim().optional(),
    company_size: z.string().trim().optional(),
    company_location: z.string().trim().optional(),
    culture_text: z.string().trim().optional(),
    benefits_text: z.string().trim().optional(),
  });
}

export type EmployerProfileValues = z.infer<
  ReturnType<typeof employerProfileSchema>
>;

/** Form field names, in submit order — used for API error mapping. */
export const EMPLOYER_PROFILE_FIELDS = [
  "company_name",
  "contact_person",
  "phone",
  "company_summary",
  "website",
  "industry",
  "company_size",
  "company_location",
  "culture_text",
  "benefits_text",
] as const;
