import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { User } from "@/features/auth/types";

// Mutable auth state the mocked useAuth reads (hoisted so the mock factory can
// reference it without a temporal-dead-zone error).
const authState = vi.hoisted(() => ({
  value: {
    user: null as User | null,
    isLoading: false,
    logout: async () => {},
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/jobs",
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

// Stub the locale switcher (its own routing wiring is out of scope here).
vi.mock("./LocaleSwitcher", () => ({ LocaleSwitcher: () => null }));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, useAuth: () => authState.value };
});

import enCommon from "@/messages/en/common.json";

import { PublicHeader } from "./PublicHeader";

function renderHeader(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: enCommon }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const CANDIDATE: User = {
  id: "1",
  email: "alex@example.com",
  role: "CANDIDATE",
  status: "ACTIVE",
  preferred_locale: "en",
  is_email_verified: true,
  profile: { full_name: "Alex Demo Candidate" },
};

describe("PublicHeader auth awareness", () => {
  it("shows guest actions when signed out", () => {
    authState.value = { user: null, isLoading: false, logout: async () => {} };
    renderHeader(<PublicHeader />);
    expect(screen.getAllByText("Sign In").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Create Account").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("shows the user's name and sign-out, not guest actions, when signed in", () => {
    authState.value = {
      user: CANDIDATE,
      isLoading: false,
      logout: async () => {},
    };
    renderHeader(<PublicHeader />);
    expect(screen.getAllByText("Alex Demo Candidate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign Out").length).toBeGreaterThan(0);
    expect(screen.queryByText("Create Account")).not.toBeInTheDocument();
  });
});
