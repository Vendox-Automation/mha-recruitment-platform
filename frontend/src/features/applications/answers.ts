/**
 * Screening-answer form ↔ API payload logic (spec §10.1, §14.3).
 *
 * The apply form holds every answer as a raw string keyed by question id (that
 * is what native inputs/selects/radios produce). On submit we convert each raw
 * value to the typed value the API expects per question type, and we run a
 * client-side required check (the server remains authoritative — spec §10).
 *
 * Kept as a pure module so the conversion + validation can be unit-tested
 * without rendering the form.
 */

import type { ScreeningQuestionType } from "./types";

/** A screening question as needed to build/validate an answer. */
export interface AnswerableQuestion {
  id: string | number;
  question_type: string;
  is_required: boolean;
  /** Allowed values for SINGLE_CHOICE (from `options_json`). */
  options_json?: string[];
}

/** Raw form values: question id → the string the control produced. */
export type RawAnswers = Record<string, string>;

/** Result of validating + building the answers payload. */
export interface BuildAnswersResult {
  /** Map of question id → typed value, ready for the API. Empty when invalid. */
  payload: Record<string, unknown>;
  /** Map of question id → i18n error key, present only for failing questions. */
  errors: Record<string, string>;
}

function normaliseType(value: string): ScreeningQuestionType | null {
  switch (value) {
    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "YES_NO":
    case "SINGLE_CHOICE":
    case "NUMBER":
      return value;
    default:
      return null;
  }
}

/**
 * Convert a single raw value to its typed API value. Returns `undefined` when
 * the field is effectively empty (so callers can skip it / flag required).
 *
 * - SHORT_TEXT / LONG_TEXT → trimmed string (undefined when blank)
 * - YES_NO                 → boolean ("true"/"yes" → true; "false"/"no" → false)
 * - SINGLE_CHOICE          → the selected option string (undefined when blank)
 * - NUMBER                 → a finite number (undefined when blank/NaN)
 */
export function buildAnswerValue(
  type: string,
  raw: string | undefined,
): unknown {
  const normalised = normaliseType(type);
  const value = (raw ?? "").trim();

  if (normalised === "YES_NO") {
    if (value === "true" || value === "yes") return true;
    if (value === "false" || value === "no") return false;
    return undefined;
  }

  if (value === "") return undefined;

  if (normalised === "NUMBER") {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }

  // SHORT_TEXT, LONG_TEXT, SINGLE_CHOICE, and unknown types → string passthrough.
  return value;
}

const REQUIRED_ERROR_KEY = "errors.required";
const INVALID_NUMBER_ERROR_KEY = "errors.invalidNumber";
const INVALID_CHOICE_ERROR_KEY = "errors.invalidChoice";

/**
 * Build the `answers` payload from raw form values, enforcing required questions
 * and per-type validity client-side. The returned `errors` map is keyed by
 * question id and holds i18n keys (under `candidate.applications`).
 *
 * Optional questions left blank are simply omitted from the payload — we never
 * send empty strings the server would have to interpret.
 */
export function buildAnswersPayload(
  questions: readonly AnswerableQuestion[],
  raw: RawAnswers,
): BuildAnswersResult {
  const payload: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const question of questions) {
    const key = String(question.id);
    const rawValue = raw[key];
    const value = buildAnswerValue(question.question_type, rawValue);

    if (value === undefined) {
      // A NUMBER with non-numeric text is "present but invalid", not empty.
      const typed = normaliseType(question.question_type);
      if (typed === "NUMBER" && (rawValue ?? "").trim() !== "") {
        errors[key] = INVALID_NUMBER_ERROR_KEY;
      } else if (question.is_required) {
        errors[key] = REQUIRED_ERROR_KEY;
      }
      continue;
    }

    if (
      normaliseType(question.question_type) === "SINGLE_CHOICE" &&
      question.options_json &&
      question.options_json.length > 0 &&
      !question.options_json.includes(value as string)
    ) {
      errors[key] = INVALID_CHOICE_ERROR_KEY;
      continue;
    }

    payload[key] = value;
  }

  return { payload, errors };
}
