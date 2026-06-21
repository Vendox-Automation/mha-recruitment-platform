import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import type { PublicInsights } from "@/features/analytics/publicInsightsTypes";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

const getPublicInsights = vi.fn();
vi.mock("@/features/analytics/publicInsightsService", () => ({
  getPublicInsights: (...args: unknown[]) => getPublicInsights(...args),
}));

// Force the shared perspective so the action prompt renders deterministically.
vi.mock("../PerspectiveContext", () => ({
  usePerspective: () => ({ perspective: "candidate", setPerspective: vi.fn() }),
}));

import enCommon from "@/messages/en/common.json";
import enHome from "@/messages/en/home.json";

import { CareerIntelligenceConsole } from "./CareerIntelligenceConsole";

const messages = { common: enCommon, home: enHome };

function renderConsole(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const EMPTY: PublicInsights = {
  published_job_count: 0,
  approved_employer_count: 0,
  recent_job_count: 0,
  popular_locations: [],
  popular_role_keywords: [],
  min_group_size: 3,
  mha_insights: [],
};

describe("CareerIntelligenceConsole honest sourcing", () => {
  beforeEach(() => {
    getPublicInsights.mockReset();
  });

  it("labels real role-keyword data as Platform analytics and shows a textual summary", async () => {
    getPublicInsights.mockResolvedValue({
      ...EMPTY,
      published_job_count: 12,
      recent_job_count: 5,
      popular_role_keywords: [
        { keyword: "analyst", count: 6 },
        { keyword: "engineer", count: 4 },
      ],
      popular_locations: [{ location: "Kuala Lumpur", count: 7 }],
    } satisfies PublicInsights);

    renderConsole(<CareerIntelligenceConsole />);

    // Roles-in-focus carries the real-analytics label, and the keywords appear
    // as text (not only inside the aria-hidden chart) — spec §13.7.
    await waitFor(() =>
      expect(screen.getByText("analyst")).toBeInTheDocument(),
    );
    expect(screen.getByText("engineer")).toBeInTheDocument();
    expect(screen.getAllByText("Platform analytics").length).toBeGreaterThan(0);
    // Real recent-activity figure is surfaced, not fabricated.
    expect(
      screen.getByText(/new roles published in the last 30 days/i),
    ).toBeInTheDocument();
    // Real location concentration renders.
    expect(screen.getByText("Kuala Lumpur")).toBeInTheDocument();
  });

  it("falls back to clearly-labelled Illustrative previews when data is empty", async () => {
    getPublicInsights.mockResolvedValue(EMPTY);

    renderConsole(<CareerIntelligenceConsole />);

    await waitFor(() =>
      expect(
        screen.getAllByText("Illustrative preview").length,
      ).toBeGreaterThan(0),
    );
    // No fabricated recent-activity figure when the real count is zero.
    expect(
      screen.queryByText(/new roles published in the last 30 days/i),
    ).not.toBeInTheDocument();
  });

  it("labels curated admin items as MHA insight", async () => {
    getPublicInsights.mockResolvedValue({
      ...EMPTY,
      mha_insights: [
        {
          id: "1",
          title: "Hiring stays selective",
          body: "Employers are prioritising proven skills.",
          category: "hiring",
          source_label: "mha_insight",
        },
      ],
    } satisfies PublicInsights);

    renderConsole(<CareerIntelligenceConsole />);

    await waitFor(() =>
      expect(
        screen.getByText("Employers are prioritising proven skills."),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText("MHA insight").length).toBeGreaterThan(0);
  });

  it("renders an honest console on fetch error (no fabricated metrics)", async () => {
    getPublicInsights.mockRejectedValue(new Error("network"));

    renderConsole(<CareerIntelligenceConsole />);

    // The query retries with backoff before settling into the error state, so
    // allow extra time for the honest static fallback to render.
    await waitFor(
      () =>
        expect(
          screen.getAllByText("Illustrative preview").length,
        ).toBeGreaterThan(0),
      { timeout: 5000 },
    );
  });
});
