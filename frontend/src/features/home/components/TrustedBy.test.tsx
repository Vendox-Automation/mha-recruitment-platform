import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Force the reduced-motion (static grid) path: deterministic, and avoids the
// jsdom matchMedia gap. The grid renders each company exactly once.
vi.mock("framer-motion", () => ({ useReducedMotion: () => true }));

// The shared UI barrel (pulled in via SourceLabel → Badge) transitively imports
// the next-intl navigation helpers, which don't resolve under jsdom. Stub them
// as the other home tests do.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

import enCommon from "@/messages/en/common.json";
import enHome from "@/messages/en/home.json";

import { TRUSTED_COMPANIES } from "../trustedCompanies";
import { TrustedBy } from "./TrustedBy";

const messages = { common: enCommon, home: enHome };

function renderTrustedBy(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TrustedBy band", () => {
  it("shows the section title and the mandatory illustrative-preview label", () => {
    renderTrustedBy(<TrustedBy />);
    expect(
      screen.getByText("Trusted by leading employers"),
    ).toBeInTheDocument();
    // Honest sourcing (AGENTS §13): never presented as real adoption.
    expect(screen.getByText("Illustrative preview")).toBeInTheDocument();
  });

  it("renders the synthetic company names", () => {
    renderTrustedBy(<TrustedBy />);
    expect(screen.getByText(TRUSTED_COMPANIES[0].name)).toBeInTheDocument();
    expect(
      screen.getByText(TRUSTED_COMPANIES[TRUSTED_COMPANIES.length - 1].name),
    ).toBeInTheDocument();
  });
});
