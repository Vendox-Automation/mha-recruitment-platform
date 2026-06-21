import { describe, expect, it } from "vitest";

import {
  formatConversionRate,
  humaniseDuration,
  toStageBars,
} from "./format";
import type { StageDistribution } from "./types";

const EMPTY_DISTRIBUTION: StageDistribution = {
  APPLIED: 0,
  UNDER_REVIEW: 0,
  SHORTLISTED: 0,
  INTERVIEW: 0,
  OFFERED: 0,
  HIRED: 0,
  REJECTED: 0,
};

describe("formatConversionRate", () => {
  it("returns null for an unreliable (null) rate so the UI hides it", () => {
    // The whole point: never coerce null → "0%".
    expect(formatConversionRate(null, "en")).toBeNull();
  });

  it("formats a 0–1 rate as a percentage", () => {
    expect(formatConversionRate(0.25, "en")).toBe("25%");
  });

  it("keeps a real zero rate as 0% (distinct from 'no data')", () => {
    expect(formatConversionRate(0, "en")).toBe("0%");
  });
});

describe("humaniseDuration", () => {
  it("returns null when the metric is withheld", () => {
    expect(humaniseDuration(null)).toBeNull();
  });

  it("picks days for multi-day durations", () => {
    expect(humaniseDuration(2 * 24 * 3600)).toEqual({ value: 2, unit: "days" });
  });

  it("picks hours for sub-day durations", () => {
    expect(humaniseDuration(3 * 3600)).toEqual({ value: 3, unit: "hours" });
  });

  it("never reports zero minutes for a sub-minute duration", () => {
    expect(humaniseDuration(20)).toEqual({ value: 1, unit: "minutes" });
  });

  it("treats a negative (nonsensical) value as no data", () => {
    expect(humaniseDuration(-10)).toBeNull();
  });
});

describe("toStageBars", () => {
  it("reports a zero total and zero-width bars for an empty distribution", () => {
    const { bars, total } = toStageBars(EMPTY_DISTRIBUTION);
    expect(total).toBe(0);
    expect(bars).toHaveLength(7);
    expect(bars.every((bar) => bar.percent === 0 && bar.fraction === 0)).toBe(
      true,
    );
  });

  it("scales bar width against the busiest stage and totals the counts", () => {
    const { bars, total } = toStageBars({
      ...EMPTY_DISTRIBUTION,
      APPLIED: 10,
      UNDER_REVIEW: 5,
    });
    expect(total).toBe(15);
    const applied = bars.find((bar) => bar.status === "APPLIED");
    const review = bars.find((bar) => bar.status === "UNDER_REVIEW");
    expect(applied?.percent).toBe(100);
    expect(review?.percent).toBe(50);
    // Fraction is share of total, not of the max.
    expect(review?.fraction).toBeCloseTo(5 / 15);
  });

  it("keeps the stage order stable (pipeline then rejected)", () => {
    const { bars } = toStageBars(EMPTY_DISTRIBUTION);
    expect(bars.map((bar) => bar.status)).toEqual([
      "APPLIED",
      "UNDER_REVIEW",
      "SHORTLISTED",
      "INTERVIEW",
      "OFFERED",
      "HIRED",
      "REJECTED",
    ]);
  });
});
