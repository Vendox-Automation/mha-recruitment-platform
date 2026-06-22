import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Disable auto-advance (deterministic) and avoid the jsdom matchMedia gap.
vi.mock("framer-motion", () => ({ useReducedMotion: () => true }));

// The shared UI barrel (via Card) transitively imports next-intl navigation,
// which does not resolve under jsdom — stub it as the other home tests do.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

import enCommon from "@/messages/en/common.json";
import enHome from "@/messages/en/home.json";

import { TESTIMONIALS } from "../testimonials";
import { TestimonialsCarousel } from "./TestimonialsCarousel";

const messages = { common: enCommon, home: enHome };

function renderCarousel(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TestimonialsCarousel", () => {
  it("shows the first quote, the illustrative label, and a text star rating", () => {
    renderCarousel(<TestimonialsCarousel />);
    expect(screen.getByText(TESTIMONIALS[0].author)).toBeInTheDocument();
    expect(screen.getByText("Illustrative preview")).toBeInTheDocument();
    // Stars expose a textual rating; no aggregate metric is shown.
    expect(screen.getByLabelText("5 out of 5")).toBeInTheDocument();
  });

  it("advances to the next testimonial on Next", () => {
    renderCarousel(<TestimonialsCarousel />);
    expect(screen.queryByText(TESTIMONIALS[1].author)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next testimonial"));
    expect(screen.getByText(TESTIMONIALS[1].author)).toBeInTheDocument();
  });
});
