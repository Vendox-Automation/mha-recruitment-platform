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
  matched: ["Job title aligns with your preference"],
  gaps: ["Location differs from your preferred area"],
  unknown: [],
  explanation: "Strong match — 82%.",
  ai_enabled: false,
  ai_provider: "",
  ai_model: "",
  rule_version: "1",
  generated_at: "2026-06-20T10:00:00Z",
  disclaimer: "Job Fit is guidance and does not guarantee an interview or hire.",
};

const SPARSE_FIT: JobFitResult = {
  ...STRONG_FIT,
  score: 0,
  band: "limited",
  matched: [],
  gaps: [],
  unknown: ["No resume on file", "No preferred title set"],
  explanation: "Limited match — 0%.",
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

  it("shows the candidate score, band label, grouped factors and disclaimer", async () => {
    getJobFit.mockResolvedValue(STRONG_FIT);

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(await screen.findByText("82%")).toBeInTheDocument();
    // Band conveyed by a text label, not colour alone.
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    // Grouped, backend-generated factor strings rendered as-is.
    expect(screen.getByText("Matched factors")).toBeInTheDocument();
    expect(
      screen.getByText("Job title aligns with your preference"),
    ).toBeInTheDocument();
    expect(screen.getByText("Possible gaps")).toBeInTheDocument();
    // The backend disclaimer is always rendered.
    expect(
      screen.getByText(
        "Job Fit is guidance and does not guarantee an interview or hire.",
      ),
    ).toBeInTheDocument();
    // Regenerate control is a labelled button.
    expect(
      screen.getByRole("button", { name: "Regenerate" }),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state (no score) when the result is mostly unknown", async () => {
    getJobFit.mockResolvedValue(SPARSE_FIT);

    renderFit(<SmartJobFit slug="site-engineer" />);

    expect(
      await screen.findByText("Not enough information yet"),
    ).toBeInTheDocument();
    // No fabricated/overstated score is presented in the sparse case.
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    // The disclaimer is STILL shown even in the empty state.
    expect(
      screen.getByText(
        "Job Fit is guidance and does not guarantee an interview or hire.",
      ),
    ).toBeInTheDocument();
  });
});
