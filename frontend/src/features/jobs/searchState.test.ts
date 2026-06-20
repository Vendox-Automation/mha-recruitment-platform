import { describe, expect, it } from "vitest";

import {
  parseSearchParams,
  searchParamsEqual,
  toQueryString,
} from "./searchState";
import type { JobSearchParams } from "./types";

describe("parseSearchParams", () => {
  it("applies defaults for an empty query", () => {
    expect(parseSearchParams("")).toEqual({
      keyword: undefined,
      location: undefined,
      employment_type: undefined,
      salary_min: undefined,
      salary_max: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("reads all filters, sort, and page from the URL", () => {
    const parsed = parseSearchParams(
      "keyword=nurse&location=London&employment_type=FULL_TIME&salary_min=30000&salary_max=50000&sort=relevant&page=3",
    );
    expect(parsed).toEqual({
      keyword: "nurse",
      location: "London",
      employment_type: "FULL_TIME",
      salary_min: 30000,
      salary_max: 50000,
      sort: "relevant",
      page: 3,
    });
  });

  it("trims blank values to undefined so the URL stays clean", () => {
    const parsed = parseSearchParams("keyword=%20%20&location=&salary_min=");
    expect(parsed.keyword).toBeUndefined();
    expect(parsed.location).toBeUndefined();
    expect(parsed.salary_min).toBeUndefined();
  });

  it("falls back to safe defaults for invalid sort/page/salary", () => {
    const parsed = parseSearchParams("sort=banana&page=0&salary_min=-5&salary_max=abc");
    expect(parsed.sort).toBe("newest");
    expect(parsed.page).toBe(1);
    expect(parsed.salary_min).toBeUndefined();
    expect(parsed.salary_max).toBeUndefined();
  });
});

describe("toQueryString", () => {
  it("omits defaults (sort=newest, page=1) and empty filters", () => {
    const params: JobSearchParams = { sort: "newest", page: 1 };
    expect(toQueryString(params)).toBe("");
  });

  it("serialises only the set values", () => {
    const params: JobSearchParams = {
      keyword: "data analyst",
      employment_type: "CONTRACT",
      salary_min: 40000,
      sort: "relevant",
      page: 2,
    };
    const qs = new URLSearchParams(toQueryString(params));
    expect(qs.get("keyword")).toBe("data analyst");
    expect(qs.get("employment_type")).toBe("CONTRACT");
    expect(qs.get("salary_min")).toBe("40000");
    expect(qs.get("sort")).toBe("relevant");
    expect(qs.get("page")).toBe("2");
    expect(qs.get("salary_max")).toBeNull();
  });
});

describe("round-trip", () => {
  it("parse(toQueryString(x)) preserves the search state", () => {
    const original: JobSearchParams = {
      keyword: "engineer",
      location: "Remote",
      employment_type: "PART_TIME",
      salary_min: 25000,
      salary_max: 35000,
      sort: "relevant",
      page: 4,
    };
    expect(parseSearchParams(toQueryString(original))).toEqual(original);
  });

  it("searchParamsEqual ignores default-vs-explicit differences", () => {
    const a: JobSearchParams = { sort: "newest", page: 1 };
    const b: JobSearchParams = { keyword: undefined, sort: "newest", page: 1 };
    expect(searchParamsEqual(a, b)).toBe(true);
  });
});
