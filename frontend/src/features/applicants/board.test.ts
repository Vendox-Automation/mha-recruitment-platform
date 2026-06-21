import { describe, expect, it } from "vitest";

import {
  groupByStatus,
  KANBAN_COLUMNS,
  needsConfirmation,
  statusLabelKey,
} from "./board";
import type { EmployerApplicantListItem } from "./types";

function item(
  id: string,
  status: EmployerApplicantListItem["status"],
): EmployerApplicantListItem {
  return {
    id,
    job: { id: "j1", title: "Site Engineer", slug: "site-engineer", status: "PUBLISHED" },
    candidate_name: `Candidate ${id}`,
    candidate_title: "Engineer",
    status,
    status_display: status,
    has_resume_snapshot: true,
    submitted_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
  };
}

describe("board", () => {
  it("exposes all seven columns in pipeline order with REJECTED last", () => {
    expect(KANBAN_COLUMNS).toEqual([
      "APPLIED",
      "UNDER_REVIEW",
      "SHORTLISTED",
      "INTERVIEW",
      "OFFERED",
      "HIRED",
      "REJECTED",
    ]);
  });

  it("groups applicants into one bucket per status, every status present", () => {
    const grouped = groupByStatus([
      item("a", "APPLIED"),
      item("b", "SHORTLISTED"),
      item("c", "APPLIED"),
      item("d", "REJECTED"),
    ]);

    expect(grouped.APPLIED.map((i) => i.id)).toEqual(["a", "c"]);
    expect(grouped.SHORTLISTED.map((i) => i.id)).toEqual(["b"]);
    expect(grouped.REJECTED.map((i) => i.id)).toEqual(["d"]);
    // Empty stages still exist as empty arrays so all columns render.
    expect(grouped.INTERVIEW).toEqual([]);
    expect(grouped.HIRED).toEqual([]);
    // Every status key is present.
    for (const status of KANBAN_COLUMNS) {
      expect(grouped[status]).toBeInstanceOf(Array);
    }
  });

  it("requires confirmation only for a move to REJECTED", () => {
    expect(needsConfirmation("REJECTED")).toBe(true);
    for (const status of KANBAN_COLUMNS.filter((s) => s !== "REJECTED")) {
      expect(needsConfirmation(status)).toBe(false);
    }
  });

  it("derives a per-status label key", () => {
    expect(statusLabelKey("SHORTLISTED")).toBe("status.SHORTLISTED.label");
  });
});
