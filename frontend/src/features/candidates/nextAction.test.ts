import { describe, expect, it } from "vitest";

import { NEXT_ACTION_ROUTE, selectNextAction } from "./nextAction";
import type { CandidateDashboard } from "./types";

type Snapshot = Pick<CandidateDashboard, "profile_completion" | "resume">;

function snapshot(missing: string[], hasResume: boolean): Snapshot {
  return {
    profile_completion: {
      percent: 0,
      complete: missing.length === 0,
      items: [],
      missing,
    },
    resume: {
      has_resume: hasResume,
      original_name: hasResume ? "cv.pdf" : null,
      uploaded_at: hasResume ? "2026-06-01T00:00:00Z" : null,
      parsing_status: "NONE",
    },
  };
}

describe("selectNextAction", () => {
  it("prioritises completing the profile when a required basic field is missing", () => {
    // Even with a resume on file, missing required basics wins.
    expect(selectNextAction(snapshot(["full_name"], true))).toBe(
      "completeProfile",
    );
    expect(selectNextAction(snapshot(["phone", "resume"], false))).toBe(
      "completeProfile",
    );
  });

  it("does not treat a missing OPTIONAL field as profile-incomplete", () => {
    // Only preferred_location missing (optional) + no resume → upload resume.
    expect(selectNextAction(snapshot(["preferred_location"], false))).toBe(
      "uploadResume",
    );
  });

  it("asks for a resume once required basics are present but none is on file", () => {
    expect(selectNextAction(snapshot(["resume"], false))).toBe("uploadResume");
  });

  it("sends a fully set-up candidate to browse jobs", () => {
    expect(selectNextAction(snapshot([], true))).toBe("browseJobs");
  });

  it("maps each action to its route", () => {
    expect(NEXT_ACTION_ROUTE.completeProfile).toBe("/candidate/profile");
    expect(NEXT_ACTION_ROUTE.uploadResume).toBe("/candidate/resume");
    expect(NEXT_ACTION_ROUTE.browseJobs).toBe("/jobs");
  });
});
