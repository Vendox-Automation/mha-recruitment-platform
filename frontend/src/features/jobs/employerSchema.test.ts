import { describe, expect, it } from "vitest";

import {
  emptyJobFormValues,
  jobFormSchema,
  jobFormValuesToWrite,
  type JobFormValues,
} from "./employerSchema";

const t = (key: string) => key;

function baseValues(overrides: Partial<JobFormValues> = {}): JobFormValues {
  return { ...emptyJobFormValues("en"), title: "Engineer", location: "KL", description: "d", requirements: "r", ...overrides };
}

describe("jobFormSchema validation", () => {
  it("rejects salary_min greater than salary_max when disclosed", () => {
    const result = jobFormSchema(t).safeParse(
      baseValues({ salary_disclosed: true, salary_min: 9000, salary_max: 1000 }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.join(".") === "salary_min" && i.message === "salaryRange",
        ),
      ).toBe(true);
    }
  });

  it("allows an out-of-order salary when figures are NOT disclosed", () => {
    const result = jobFormSchema(t).safeParse(
      baseValues({ salary_disclosed: false, salary_min: 9000, salary_max: 1000 }),
    );
    expect(result.success).toBe(true);
  });

  it("requires at least two options for a single-choice question", () => {
    const result = jobFormSchema(t).safeParse(
      baseValues({
        screening_questions: [
          {
            question: "Pick one",
            question_type: "SINGLE_CHOICE",
            is_required: true,
            options: [{ value: "only one" }],
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "singleChoiceOptions"),
      ).toBe(true);
    }
  });
});

describe("jobFormValuesToWrite", () => {
  it("drops salary figures when not disclosed", () => {
    const write = jobFormValuesToWrite(
      baseValues({ salary_disclosed: false, salary_min: 5000, salary_max: 8000 }),
    );
    expect(write.salary_disclosed).toBe(false);
    expect(write.salary_min).toBeNull();
    expect(write.salary_max).toBeNull();
  });

  it("keeps salary figures when disclosed", () => {
    const write = jobFormValuesToWrite(
      baseValues({ salary_disclosed: true, salary_min: 5000, salary_max: 8000 }),
    );
    expect(write.salary_min).toBe(5000);
    expect(write.salary_max).toBe(8000);
  });

  it("flattens options and drops blanks for single-choice; clears for other types", () => {
    const write = jobFormValuesToWrite(
      baseValues({
        screening_questions: [
          {
            question: "Pick",
            question_type: "SINGLE_CHOICE",
            is_required: false,
            options: [{ value: "A" }, { value: " " }, { value: "B" }],
          },
          {
            question: "Why",
            question_type: "LONG_TEXT",
            is_required: true,
            options: [{ value: "ignored" }],
          },
        ],
      }),
    );
    expect(write.screening_questions[0].options_json).toEqual(["A", "B"]);
    expect(write.screening_questions[0].display_order).toBe(0);
    expect(write.screening_questions[1].options_json).toEqual([]);
    expect(write.screening_questions[1].display_order).toBe(1);
  });
});
