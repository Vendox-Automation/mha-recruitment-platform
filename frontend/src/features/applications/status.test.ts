import { describe, expect, it } from "vitest";

import enCandidate from "@/messages/en/candidate.json";
import zhCandidate from "@/messages/zh-CN/candidate.json";

import {
  ALL_STATUSES,
  isTerminalStatus,
  PIPELINE_STAGES,
  statusLabelKey,
  statusMeaningKey,
  statusNextActionKey,
  statusTone,
} from "./status";
import type { ApplicationStatus } from "./types";

type StatusMessages = Record<
  ApplicationStatus,
  { label: string; meaning: string; next: string }
>;

const en = (enCandidate.applications.status as unknown) as StatusMessages;
const zh = (zhCandidate.applications.status as unknown) as StatusMessages;

describe("status mapping", () => {
  it("excludes REJECTED from the positive pipeline (never an achievement)", () => {
    expect(PIPELINE_STAGES).not.toContain("REJECTED");
    expect(ALL_STATUSES).toContain("REJECTED");
    // The pipeline runs in a sensible progression order.
    expect(PIPELINE_STAGES[0]).toBe("APPLIED");
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]).toBe("HIRED");
  });

  it("never colours REJECTED as success or danger-as-blame", () => {
    expect(statusTone("REJECTED")).toBe("neutral");
    expect(statusTone("HIRED")).toBe("success");
  });

  it("maps every status to a label + meaning + next action in BOTH locales", () => {
    for (const status of ALL_STATUSES) {
      expect(statusLabelKey(status)).toBe(`status.${status}.label`);
      expect(statusMeaningKey(status)).toBe(`status.${status}.meaning`);
      expect(statusNextActionKey(status)).toBe(`status.${status}.next`);

      expect(en[status]?.label).toBeTruthy();
      expect(en[status]?.meaning).toBeTruthy();
      expect(en[status]?.next).toBeTruthy();
      expect(zh[status]?.label).toBeTruthy();
      expect(zh[status]?.meaning).toBeTruthy();
      expect(zh[status]?.next).toBeTruthy();
    }
  });

  it("treats HIRED and REJECTED as terminal, others as ongoing", () => {
    expect(isTerminalStatus("HIRED")).toBe(true);
    expect(isTerminalStatus("REJECTED")).toBe(true);
    expect(isTerminalStatus("APPLIED")).toBe(false);
    expect(isTerminalStatus("INTERVIEW")).toBe(false);
  });
});
