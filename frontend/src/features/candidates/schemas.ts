import { z } from "zod";

import type { ValidationTranslator } from "@/features/auth/schemas";

/**
 * Candidate profile form schema (spec §14.7; ADR-0001 §1.2 react-hook-form +
 * zod). Validation copy is message-driven via a `validation`-bound translator
 * so it stays bilingual and centralised.
 *
 * Client checks MIRROR the server rules but are UX only — Django remains
 * authoritative (CLAUDE.md §10). The basic identity fields are required;
 * matching preferences are optional and completed over time.
 */
export function candidateProfileSchema(t: ValidationTranslator) {
  return z.object({
    full_name: z.string().trim().min(1, { message: t("required") }),
    phone: z.string().trim().min(1, { message: t("required") }),
    preferred_job_title: z.string().trim().min(1, { message: t("required") }),
    preferred_location: z.string().trim().optional(),
    preferred_employment_type: z.string().trim().optional(),
  });
}

export type CandidateProfileValues = z.infer<
  ReturnType<typeof candidateProfileSchema>
>;

/** Form field names, in submit order — used for API error mapping. */
export const CANDIDATE_PROFILE_FIELDS = [
  "full_name",
  "phone",
  "preferred_job_title",
  "preferred_location",
  "preferred_employment_type",
] as const;

/**
 * Employment-type options offered for the matching preference. Mirrors the
 * employer job employment-type codes so a candidate's preference reads against
 * the same vocabulary; the field is free-text on the backend, and "" means "no
 * preference set".
 */
export const PREFERRED_EMPLOYMENT_TYPE_OPTIONS = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "TEMPORARY",
] as const;
