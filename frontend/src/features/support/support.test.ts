import { describe, expect, it } from "vitest";

import { SUPPORT_CATEGORIES, categoryKey, statusTone } from "./support";
import type { SupportCategory } from "./types";

describe("categoryKey", () => {
  it("maps every backend category to its i18n key suffix", () => {
    const expected: Record<SupportCategory, string> = {
      JOB_APPLICATION: "application",
      RESUME: "resume",
      CAREER_DIRECTION: "career",
      APPLICATION_STATUS: "status",
      OTHER: "other",
    };
    for (const category of SUPPORT_CATEGORIES) {
      expect(categoryKey(category)).toBe(expected[category]);
    }
  });

  it("offers all five categories in a deliberate order", () => {
    expect(SUPPORT_CATEGORIES).toEqual([
      "JOB_APPLICATION",
      "RESUME",
      "CAREER_DIRECTION",
      "APPLICATION_STATUS",
      "OTHER",
    ]);
  });
});

describe("statusTone", () => {
  it("maps each status to a tone (resolved reads as success, closed neutral)", () => {
    expect(statusTone("RESOLVED")).toBe("success");
    expect(statusTone("CLOSED")).toBe("neutral");
    expect(statusTone("NEW")).toBe("info");
    expect(statusTone("IN_PROGRESS")).toBe("brand");
  });
});
