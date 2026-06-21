import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import type { SavedJob } from "../savedJobsTypes";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

// Control the auth role per test.
const authState: { role: string | null; isAuthenticated: boolean } = {
  role: "CANDIDATE",
  isAuthenticated: true,
};
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    role: authState.role,
    isAuthenticated: authState.isAuthenticated,
    isLoading: false,
  }),
}));

// Mock the saved-jobs service so no network is hit.
const listSavedJobs = vi.fn();
const saveJob = vi.fn();
const unsaveJob = vi.fn();
vi.mock("../savedJobsService", () => ({
  listSavedJobs: (...args: unknown[]) => listSavedJobs(...args),
  saveJob: (...args: unknown[]) => saveJob(...args),
  unsaveJob: (...args: unknown[]) => unsaveJob(...args),
}));

import enJobs from "@/messages/en/jobs.json";

import { SaveJobButton } from "./SaveJobButton";

const messages = { jobs: enJobs };

function renderButton(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function savedRow(slug: string, jobId?: string): SavedJob {
  return {
    id: `row-${slug}`,
    created_at: "2026-06-01T00:00:00Z",
    is_available: true,
    job: {
      id: jobId,
      slug,
      title: "Role",
      location: null,
      employment_type: "FULL_TIME",
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_period: null,
      salary_disclosed: false,
      status: "PUBLISHED",
      is_mha_supported: false,
      company: null,
    },
  };
}

describe("SaveJobButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.role = "CANDIDATE";
    authState.isAuthenticated = true;
    listSavedJobs.mockResolvedValue([]);
  });

  it("hides the toggle from employers (saving is candidate-only)", () => {
    authState.role = "EMPLOYER";
    const { container } = renderButton(<SaveJobButton slug="role-a" />);
    expect(container).toBeEmptyDOMElement();
    expect(listSavedJobs).not.toHaveBeenCalled();
  });

  it("prompts anonymous visitors to sign in instead of fetching saved jobs", () => {
    authState.isAuthenticated = false;
    authState.role = null;
    renderButton(<SaveJobButton slug="role-a" />);
    const link = screen.getByRole("link", { name: "Sign in to save" });
    expect(link).toHaveAttribute("href", "/sign-in");
    expect(listSavedJobs).not.toHaveBeenCalled();
  });

  it("optimistically flips to Saved on click, then confirms with the server", async () => {
    const user = userEvent.setup();
    const saved = savedRow("role-a", "job-a");
    saveJob.mockResolvedValue(saved);
    // The post-save re-fetch (onSettled invalidation) reflects the new state.
    listSavedJobs.mockResolvedValueOnce([]).mockResolvedValue([saved]);

    renderButton(<SaveJobButton slug="role-a" />);

    const button = await screen.findByRole("button", { name: "Save Job" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    // The label flips to Saved (optimistically, then confirmed by the server).
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saved" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(saveJob).toHaveBeenCalledWith("role-a", "en");
  });

  it("rolls back to Save and surfaces an error when the save fails", async () => {
    const user = userEvent.setup();
    saveJob.mockRejectedValue(new Error("boom"));

    renderButton(<SaveJobButton slug="role-a" />);

    const button = await screen.findByRole("button", { name: "Save Job" });
    await user.click(button);

    // After the failed mutation settles, the label is back to "Save Job".
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Job" }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
    // The rollback notice is announced for assistive tech.
    expect(screen.getByRole("status")).toHaveTextContent(
      enJobs.detail.save.error,
    );
  });

  it("un-saves an already-saved job using the job id", async () => {
    const user = userEvent.setup();
    // Saved at first; the post-unsave re-fetch reflects the empty list.
    listSavedJobs
      .mockResolvedValueOnce([savedRow("role-a", "job-a")])
      .mockResolvedValue([]);
    unsaveJob.mockResolvedValue(undefined);

    renderButton(<SaveJobButton slug="role-a" />);

    const button = await screen.findByRole("button", { name: "Saved" });
    await user.click(button);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Job" }),
      ).toBeInTheDocument(),
    );
    expect(unsaveJob).toHaveBeenCalledWith("job-a", "en");
  });

  it("disables the toggle for a saved job whose id is unknown (cannot un-save)", async () => {
    // No job id on the row → un-save has no key, so the control stays disabled.
    listSavedJobs.mockResolvedValue([savedRow("role-a", undefined)]);

    renderButton(<SaveJobButton slug="role-a" />);

    const button = await screen.findByRole("button", { name: "Saved" });
    expect(button).toBeDisabled();
    expect(unsaveJob).not.toHaveBeenCalled();
  });
});
