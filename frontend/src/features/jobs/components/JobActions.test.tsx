import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import type { ApplicationDetail } from "@/features/applications/types";

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

// Control the already-applied probe.
const getJobApplicationStatus = vi.fn();
vi.mock("@/features/applications/service", () => ({
  getJobApplicationStatus: (...args: unknown[]) =>
    getJobApplicationStatus(...args),
}));

import enCandidate from "@/messages/en/candidate.json";
import enCommon from "@/messages/en/common.json";
import enJobs from "@/messages/en/jobs.json";

import { JobActions } from "./JobActions";

const messages = { candidate: enCandidate, common: enCommon, jobs: enJobs };

function renderActions(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const APPLICATION: ApplicationDetail = {
  id: 77,
  job: {
    title: "Site Engineer",
    slug: "site-engineer",
    company_name: "Acme",
    location: "London",
    employment_type: "FULL_TIME",
  },
  status: "UNDER_REVIEW",
  submitted_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-02T00:00:00Z",
  cover_letter: "",
  answers: [],
  status_history: [],
  has_resume_snapshot: true,
  resume_snapshot_name: "cv.pdf",
};

describe("JobActions already-applied switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.role = "CANDIDATE";
    authState.isAuthenticated = true;
  });

  it("shows Apply Now (→ apply route) for a candidate who has not applied", async () => {
    getJobApplicationStatus.mockResolvedValue(null);

    renderActions(<JobActions slug="site-engineer" />);

    const apply = await screen.findByRole("link", { name: "Apply Now" });
    expect(apply).toHaveAttribute("href", "/jobs/site-engineer/apply");
    expect(
      screen.queryByRole("link", { name: "View Application" }),
    ).not.toBeInTheDocument();
  });

  it("switches to View Application with the current stage once applied", async () => {
    getJobApplicationStatus.mockResolvedValue(APPLICATION);

    renderActions(<JobActions slug="site-engineer" />);

    const view = await screen.findByRole("link", { name: "View Application" });
    expect(view).toHaveAttribute("href", "/candidate/applications/77");
    // The current localised stage is shown alongside (mapped on the frontend).
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Apply Now" }),
    ).not.toBeInTheDocument();
  });

  it("prompts anonymous visitors to sign in and never probes application status", async () => {
    authState.isAuthenticated = false;
    authState.role = null;

    renderActions(<JobActions slug="site-engineer" />);

    const signIn = await screen.findByRole("link", { name: "Sign in to apply" });
    expect(signIn).toHaveAttribute("href", "/sign-in");
    expect(getJobApplicationStatus).not.toHaveBeenCalled();
  });
});
