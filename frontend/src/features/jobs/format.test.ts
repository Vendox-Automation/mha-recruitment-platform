import { describe, expect, it } from "vitest";

import { employmentTypeKey, formatDate, formatSalary } from "./format";
import type { PublicJobListItem } from "./types";

type SalaryFields = Pick<
  PublicJobListItem,
  "salary_disclosed" | "salary_min" | "salary_max" | "salary_currency" | "salary_period"
>;

const base: SalaryFields = {
  salary_disclosed: true,
  salary_min: null,
  salary_max: null,
  salary_currency: "GBP",
  salary_period: "year",
};

describe("formatSalary", () => {
  it("reports undisclosed when the employer hid figures", () => {
    const result = formatSalary({ ...base, salary_disclosed: false }, "en-GB");
    expect(result.disclosed).toBe(false);
    expect(result.text).toBeNull();
  });

  it("reports undisclosed when both bounds are missing", () => {
    const result = formatSalary(
      { ...base, salary_disclosed: true, salary_min: null, salary_max: null },
      "en-GB",
    );
    expect(result.disclosed).toBe(false);
  });

  it("formats a range with currency and period label", () => {
    const result = formatSalary(
      { ...base, salary_min: 30000, salary_max: 50000 },
      "en-GB",
      { year: "per year" },
    );
    expect(result.disclosed).toBe(true);
    expect(result.text).toContain("30,000");
    expect(result.text).toContain("50,000");
    expect(result.text).toContain("per year");
  });

  it("formats a single bound when only one is present", () => {
    const result = formatSalary(
      { ...base, salary_min: 40000, salary_max: null },
      "en-GB",
    );
    expect(result.text).toContain("40,000");
    expect(result.text).not.toContain("–");
  });
});

describe("employmentTypeKey", () => {
  it("maps backend codes to i18n keys", () => {
    expect(employmentTypeKey("FULL_TIME")).toBe("fullTime");
    expect(employmentTypeKey("PART_TIME")).toBe("partTime");
  });

  it("returns null for unknown or empty codes", () => {
    expect(employmentTypeKey("ALIEN")).toBeNull();
    expect(employmentTypeKey(null)).toBeNull();
    expect(employmentTypeKey(undefined)).toBeNull();
  });
});

describe("formatDate", () => {
  it("returns null for missing or invalid dates", () => {
    expect(formatDate(null, "en-GB")).toBeNull();
    expect(formatDate("not-a-date", "en-GB")).toBeNull();
  });

  it("formats a valid ISO date", () => {
    expect(formatDate("2026-06-20T00:00:00Z", "en-GB")).toContain("2026");
  });
});
