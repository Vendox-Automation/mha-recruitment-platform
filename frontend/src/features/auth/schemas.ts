import { z } from "zod";

/**
 * Auth form schemas (ADR-0001 §1.2 react-hook-form + zod). Validation messages
 * are message-driven: each builder takes a translator `t` (bound to the
 * `validation` namespace) so copy stays bilingual and in one place (spec §14,
 * §17.4). These are client-side UX checks only — Django remains authoritative
 * (spec §10), so rules are intentionally light (presence + basic shape).
 */

export type ValidationTranslator = (key: string) => string;

/** Minimum password length surfaced to the user (hint copy matches this). */
const MIN_PASSWORD = 10;

function requiredString(t: ValidationTranslator) {
  return z.string().trim().min(1, { message: t("required") });
}

function passwordField(t: ValidationTranslator) {
  return z
    .string()
    .min(1, { message: t("required") })
    .min(MIN_PASSWORD, { message: t("passwordWeak") });
}

export function signInSchema(t: ValidationTranslator) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("email") }),
    password: z.string().min(1, { message: t("required") }),
  });
}
export type SignInValues = z.infer<ReturnType<typeof signInSchema>>;

export function candidateRegisterSchema(t: ValidationTranslator) {
  return z.object({
    full_name: requiredString(t),
    email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("email") }),
    password: passwordField(t),
    phone: requiredString(t),
    preferred_job_title: requiredString(t),
    preferred_location: z.string().trim().optional(),
    preferred_employment_type: z.string().trim().optional(),
  });
}
export type CandidateRegisterValues = z.infer<
  ReturnType<typeof candidateRegisterSchema>
>;

export function employerRegisterSchema(t: ValidationTranslator) {
  return z.object({
    company_name: requiredString(t),
    email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("workEmail") }),
    password: passwordField(t),
    contact_person: requiredString(t),
    phone: requiredString(t),
  });
}
export type EmployerRegisterValues = z.infer<
  ReturnType<typeof employerRegisterSchema>
>;

export function passwordResetRequestSchema(t: ValidationTranslator) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t("required") })
      .email({ message: t("email") }),
  });
}
export type PasswordResetRequestValues = z.infer<
  ReturnType<typeof passwordResetRequestSchema>
>;

/** Which stepper step each candidate field belongs to (for per-step validate). */
export const CANDIDATE_STEP_FIELDS = {
  account: ["full_name", "email", "password"],
  profile: ["phone", "preferred_job_title"],
  preferences: ["preferred_location", "preferred_employment_type"],
} as const satisfies Record<string, readonly (keyof CandidateRegisterValues)[]>;
