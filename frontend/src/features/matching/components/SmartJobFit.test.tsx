import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import type { JobFitResult } from "../types";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

// Control the viewer role per test.
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

// Control the fit fetch.
const getJobFit = vi.fn();
const regenerateJobFit = vi.fn();
vi.mock("../service", () => ({
  getJobFit: (...args: unknown[]) => getJobFit(...args),
  regenerateJobFit: (...args: unknown[]) => regenerateJobFit(...args),
}));

import enCommon from "@/messages/en/common.json";
import enJobs from "@/messages/en/jobs.json";

import { SmartJobFit } from "./SmartJobFit";

const messages = { common: enCommon, jobs: enJobs };

function renderFit(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const STRONG_FIT: JobFitResult = {
  score: 82,
  band: "strong",
  matched: ["title_strong"],
  gaps: ["location_mismatch"],
  unknown: [],
  ai_enabled: false,
  ai_explanation: "",
  ai_provider: "",
  ai_model: "",
  rule_version: "1",
  generated_at: "2026-06-20T10:00:00Z",
  // Backend English disclaimer — the UI renders the LOCALISED one, not this.
  disclaimer: "Backend English disclaimer that must NOT be shown.",
};

const SPARSE_FIT: JobFitResult = {
  ...STRONG_FIT,
  score: 0,
  band: "limited",
  matched: [],
  gaps: [],
  unknown: ["resume_unknown", "title_unknown"],
};

describe("SmartJobFit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.role = "CANDIDATE";
    authState.isAuthenticated = true;
  });

  it("prompts an anonymous visitor to sign in and never fetches the fit", () => {
    authState.isAuthenticated = false;
    authState.role = null;

    renderFit(<SmartJobFit slug="site-engineer" />);

    const link = screen.getByRole("link", { name: "Sign in to see your Job Fit" });
    expect(link).toHaveAttribute("href", "/sign-in");
    expect(getJobFit).not.toHaveBeenCalled();
  });

  it("renders nothing for an employer (candidate-only feature)", () => {
    authState.role = "EMPLOYER";

    const { container } = renderFit(<SmartJobFit slug="site-engineer" />);

    expect(container).toBeEmptyDOMElement();
    expect(getJobFit).not.toHaveBeenCalled();
  });

  it("localises reason CODES, builds the explanation on the frontend, and shows the localised disclaimer", async () => {
    getJobFit.mockResolvedValue(STRONG_FIT);

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(await screen.findByText("82%")).toBeInTheDocument();
    // Band conveyed by a text label, not colour alone.
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    // Reason codes resolved to localised copy (NOT the raw code).
    expect(screen.getByText("Matched factors")).toBeInTheDocument();
    expect(
      screen.getByText("The job title closely matches your preferred role"),
    ).toBeInTheDocument();
    expect(screen.queryByText("title_strong")).not.toBeInTheDocument();
    expect(screen.getByText("Possible gaps")).toBeInTheDocument();
    expect(
      screen.getByText("The location differs from your preferred location"),
    ).toBeInTheDocument();
    // Frontend-composed explanation prose (ai disabled → no backend prose).
    expect(
      screen.getByText(/Strengths:.*Possible gaps:/),
    ).toBeInTheDocument();
    // The LOCALISED disclaimer is shown; the backend English one is NOT.
    expect(
      screen.getByText(
        "Job Fit shows alignment only. It does not guarantee an interview or a hire.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Backend English disclaimer that must NOT be shown."),
    ).not.toBeInTheDocument();
    // Regenerate control is a labelled button.
    expect(
      screen.getByRole("button", { name: "Regenerate" }),
    ).toBeInTheDocument();
  });

  it("drops unrecognised reason codes instead of rendering them raw", async () => {
    getJobFit.mockResolvedValue({
      ...STRONG_FIT,
      matched: ["title_strong", "future_unknown_code"],
    });

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(
      await screen.findByText("The job title closely matches your preferred role"),
    ).toBeInTheDocument();
    expect(screen.queryByText("future_unknown_code")).not.toBeInTheDocument();
  });

  it("renders the backend ai_explanation only when ai_enabled is true", async () => {
    getJobFit.mockResolvedValue({
      ...STRONG_FIT,
      ai_enabled: true,
      ai_explanation: "An AI-authored summary of your fit.",
    });

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(
      await screen.findByText("An AI-authored summary of your fit."),
    ).toBeInTheDocument();
    // The deterministic frontend prose is NOT shown on the AI path.
    expect(screen.queryByText(/^Strengths:/)).not.toBeInTheDocument();
  });

  it("shows the honest empty state (no score) when the result is mostly unknown", async () => {
    getJobFit.mockResolvedValue(SPARSE_FIT);

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(
      await screen.findByText("Not enough information yet"),
    ).toBeInTheDocument();
    // No fabricated/overstated score is presented in the sparse case.
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    // The localised disclaimer is STILL shown even in the empty state.
    expect(
      screen.getByText(
        "Job Fit shows alignment only. It does not guarantee an interview or a hire.",
      ),
    ).toBeInTheDocument();
  });
});
