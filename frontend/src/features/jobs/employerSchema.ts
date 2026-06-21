import { z } from "zod";

import type { ValidationTranslator } from "@/features/auth/schemas";

import type {
  EmployerJob,
  EmployerJobWrite,
  EmploymentTypeCode,
  SalaryPeriodCode,
  ScreeningQuestionType,
} from "./employerTypes";

/**
 * Employer job create/edit form schema (spec §14.11; ADR-0001 §1.2
 * react-hook-form + zod). Validation copy is message-driven via a
 * `validation`-bound translator so it stays bilingual and centralised.
 *
 * Client checks MIRROR the server rules but are UX only — Django remains
 * authoritative (CLAUDE.md §10). Mirrored rules: required title/location/
 * employment_type/description/requirements; salary_min ≤ salary_max; and
 * single-choice screening questions need ≥2 non-empty options. Salary figures
 * are disabled (and cleared) when "salary not disclosed" is on, so they are
 * optional in the schema.
 */

export const EMPLOYMENT_TYPE_OPTIONS: EmploymentTypeCode[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "TEMPORARY",
];

export const SALARY_PERIOD_OPTIONS: SalaryPeriodCode[] = [
  "HOURLY",
  "DAILY",
  "MONTHLY",
  "YEARLY",
];

export const SCREENING_QUESTION_TYPES: ScreeningQuestionType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "YES_NO",
  "SINGLE_CHOICE",
  "NUMBER",
];

export const SUPPORTED_CURRENCIES = ["MYR", "SGD", "USD", "CNY"] as const;
export const DEFAULT_CURRENCY = "MYR";

/** Coerce an optional numeric input: "" → null, otherwise a finite number. */
const optionalAmount = (t: ValidationTranslator) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "" || value === null) return null;
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    })
    .refine((value) => value === null || (!Number.isNaN(value) && value >= 0), {
      message: t("required"),
    });

function screeningQuestionSchema(t: ValidationTranslator) {
  return z
    .object({
      question: z.string().trim().min(1, { message: t("required") }),
      question_type: z.enum(
        SCREENING_QUESTION_TYPES as [ScreeningQuestionType, ...ScreeningQuestionType[]],
      ),
      is_required: z.boolean(),
      // Held as an array of free-text rows in the form; pruned/validated below.
      options: z.array(z.object({ value: z.string() })),
    })
    .superRefine((q, ctx) => {
      if (q.question_type === "SINGLE_CHOICE") {
        const filled = q.options.filter((o) => o.value.trim().length > 0);
        if (filled.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options"],
            message: t("singleChoiceOptions"),
          });
        }
      }
    });
}

export function jobFormSchema(t: ValidationTranslator) {
  return z
    .object({
      title: z.string().trim().min(1, { message: t("required") }),
      location: z.string().trim().min(1, { message: t("required") }),
      employment_type: z.enum(
        EMPLOYMENT_TYPE_OPTIONS as [EmploymentTypeCode, ...EmploymentTypeCode[]],
      ),
      salary_disclosed: z.boolean(),
      salary_min: optionalAmount(t),
      salary_max: optionalAmount(t),
      salary_currency: z.string().trim().min(1),
      salary_period: z.enum(
        SALARY_PERIOD_OPTIONS as [SalaryPeriodCode, ...SalaryPeriodCode[]],
      ),
      description: z.string().trim().min(1, { message: t("required") }),
      requirements: z.string().trim().min(1, { message: t("required") }),
      application_deadline: z.string().trim().optional(),
      listing_language: z.string().trim().min(1),
      screening_questions: z.array(screeningQuestionSchema(t)),
    })
    .superRefine((values, ctx) => {
      // salary_min ≤ salary_max — only when disclosed and both present.
      if (
        values.salary_disclosed &&
        values.salary_min != null &&
        values.salary_max != null &&
        !Number.isNaN(values.salary_min) &&
        !Number.isNaN(values.salary_max) &&
        values.salary_min > values.salary_max
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["salary_min"],
          message: t("salaryRange"),
        });
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof jobFormSchema>>;

/** Top-level form field names, in submit order — used for API error mapping. */
export const JOB_FORM_FIELDS = [
  "title",
  "location",
  "employment_type",
  "salary_min",
  "salary_max",
  "salary_currency",
  "salary_period",
  "salary_disclosed",
  "description",
  "requirements",
  "application_deadline",
  "listing_language",
] as const;

/** Empty defaults for the create form, seeded from the active locale. */
export function emptyJobFormValues(listingLanguage: string): JobFormValues {
  return {
    title: "",
    location: "",
    employment_type: "FULL_TIME",
    salary_disclosed: true,
    salary_min: null,
    salary_max: null,
    salary_currency: DEFAULT_CURRENCY,
    salary_period: "MONTHLY",
    description: "",
    requirements: "",
    application_deadline: "",
    listing_language: listingLanguage === "zh-CN" ? "zh-CN" : "en",
    screening_questions: [],
  };
}

/** Map an API job onto react-hook-form values (null → empty/disabled inputs). */
export function jobToFormValues(job: EmployerJob): JobFormValues {
  return {
    title: job.title ?? "",
    location: job.location ?? "",
    employment_type: job.employment_type,
    salary_disclosed: job.salary_disclosed,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_currency: job.salary_currency || DEFAULT_CURRENCY,
    salary_period: job.salary_period,
    description: job.description ?? "",
    requirements: job.requirements ?? "",
    application_deadline: job.application_deadline ?? "",
    listing_language: job.listing_language || "en",
    screening_questions: (job.screening_questions ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((q) => ({
        question: q.question,
        question_type: q.question_type,
        is_required: q.is_required,
        options: (q.options_json ?? []).map((value) => ({ value })),
      })),
  };
}

/**
 * Translate validated form values into the API write payload. Drops salary
 * figures when undisclosed (the public serializer would null them anyway, and we
 * never persist a figure the employer chose to hide), normalises options to the
 * server's flat `options_json`, and stamps `display_order` from list position.
 */
export function jobFormValuesToWrite(values: JobFormValues): EmployerJobWrite {
  const disclosed = values.salary_disclosed;
  return {
    title: values.title.trim(),
    location: values.location.trim(),
    employment_type: values.employment_type,
    salary_disclosed: disclosed,
    salary_min: disclosed ? normaliseAmount(values.salary_min) : null,
    salary_max: disclosed ? normaliseAmount(values.salary_max) : null,
    salary_currency: values.salary_currency,
    salary_period: values.salary_period,
    description: values.description.trim(),
    requirements: values.requirements.trim(),
    application_deadline: values.application_deadline?.trim()
      ? values.application_deadline.trim()
      : null,
    listing_language: values.listing_language,
    screening_questions: values.screening_questions.map((q, index) => ({
      question: q.question.trim(),
      question_type: q.question_type,
      is_required: q.is_required,
      options_json:
        q.question_type === "SINGLE_CHOICE"
          ? q.options.map((o) => o.value.trim()).filter((v) => v.length > 0)
          : [],
      display_order: index,
    })),
  };
}

function normaliseAmount(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}
