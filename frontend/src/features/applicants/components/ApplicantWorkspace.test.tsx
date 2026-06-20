import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/lib/api/client";
import { createQueryClient } from "@/lib/queryClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

import enCommon from "@/messages/en/common.json";
import enEmployer from "@/messages/en/employer.json";
import enJobs from "@/messages/en/jobs.json";

import { ApplicantWorkspace } from "./ApplicantWorkspace";
import type { EmployerApplicantListItem } from "../types";

const getJobApplicants = vi.fn();
const updateApplicantStatus = vi.fn();

vi.mock("../service", async () => {
  const actual = await vi.importActual<typeof import("../service")>("../service");
  return {
    ...actual,
    getJobApplicants: (...args: unknown[]) => getJobApplicants(...args),
    updateApplicantStatus: (...args: unknown[]) => updateApplicantStatus(...args),
    // The detail pane is rendered in split-screen; stub it so the test focuses
    // on the list/Kanban behaviour without a second network shape.
    getApplicant: vi.fn().mockRejectedValue(new Error("not used in this test")),
  };
});

const messages = { employer: enEmployer, common: enCommon, jobs: enJobs };

function renderWorkspace(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function row(
  id: string,
  status: EmployerApplicantListItem["status"],
  name: string,
): EmployerApplicantListItem {
  return {
    id,
    job: { id: "job-1", title: "Site Engineer", slug: "site-engineer", status: "PUBLISHED" },
    candidate_name: name,
    candidate_title: "Engineer",
    status,
    status_display: status,
    has_resume_snapshot: true,
    submitted_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
  };
}

function page(results: EmployerApplicantListItem[]) {
  return { count: results.length, next: null, previous: null, results };
}

describe("ApplicantWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves a candidate via the keyboard select and persists via PATCH", async () => {
    const user = userEvent.setup();
    getJobApplicants.mockResolvedValue(page([row("a", "APPLIED", "Alice")]));
    updateApplicantStatus.mockResolvedValue({
      id: "a",
      status: "SHORTLISTED",
    });

    renderWorkspace(<ApplicantWorkspace jobId="job-1" />);

    // Switch to the Kanban view (keyboard-operable per-card move control).
    await user.click(screen.getByRole("tab", { name: "Kanban" }));

    const card = (await screen.findByText("Alice")).closest("div")!;
    const moveSelect = within(card.parentElement as HTMLElement).getByRole(
      "combobox",
    );

    await user.selectOptions(moveSelect, "SHORTLISTED");

    await waitFor(() => expect(updateApplicantStatus).toHaveBeenCalledOnce());
    const [id, body] = updateApplicantStatus.mock.calls[0];
    expect(id).toBe("a");
    expect(body).toMatchObject({ status: "SHORTLISTED" });
  });

  it("rolls back the optimistic move and shows an error when the PATCH fails", async () => {
    const user = userEvent.setup();
    getJobApplicants.mockResolvedValue(page([row("a", "APPLIED", "Alice")]));
    updateApplicantStatus.mockRejectedValue(
      new ApiRequestError({ code: "server_error", message: "boom", status: 500 }),
    );

    renderWorkspace(<ApplicantWorkspace jobId="job-1" />);

    await user.click(screen.getByRole("tab", { name: "Kanban" }));

    const card = (await screen.findByText("Alice")).closest("div")!;
    const moveSelect = within(card.parentElement as HTMLElement).getByRole(
      "combobox",
    ) as HTMLSelectElement;

    await user.selectOptions(moveSelect, "INTERVIEW");

    // The error banner appears and the optimistic change is reverted (the
    // select returns to APPLIED because the cache rolled back).
    expect(
      await screen.findByText(/couldn't move the candidate/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(moveSelect.value).toBe("APPLIED"));
  });

  it("asks for confirmation before a move to REJECTED and only then PATCHes", async () => {
    const user = userEvent.setup();
    getJobApplicants.mockResolvedValue(page([row("a", "APPLIED", "Alice")]));
    updateApplicantStatus.mockResolvedValue({ id: "a", status: "REJECTED" });

    renderWorkspace(<ApplicantWorkspace jobId="job-1" />);

    await user.click(screen.getByRole("tab", { name: "Kanban" }));

    const card = (await screen.findByText("Alice")).closest("div")!;
    const moveSelect = within(card.parentElement as HTMLElement).getByRole(
      "combobox",
    );

    await user.selectOptions(moveSelect, "REJECTED");

    // The dialog opens; no PATCH yet.
    const dialog = await screen.findByRole("dialog");
    expect(updateApplicantStatus).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Reject candidate" }),
    );

    await waitFor(() => expect(updateApplicantStatus).toHaveBeenCalledOnce());
    expect(updateApplicantStatus.mock.calls[0][1]).toMatchObject({
      status: "REJECTED",
    });
  });

  it("cancelling the rejection dialog does not PATCH", async () => {
    const user = userEvent.setup();
    getJobApplicants.mockResolvedValue(page([row("a", "APPLIED", "Alice")]));

    renderWorkspace(<ApplicantWorkspace jobId="job-1" />);

    await user.click(screen.getByRole("tab", { name: "Kanban" }));

    const card = (await screen.findByText("Alice")).closest("div")!;
    const moveSelect = within(card.parentElement as HTMLElement).getByRole(
      "combobox",
    );

    await user.selectOptions(moveSelect, "REJECTED");
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(updateApplicantStatus).not.toHaveBeenCalled();
  });
});
