import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";

import enHome from "@/messages/en/home.json";

import { parsePerspective, usePerspective } from "./PerspectiveContext";
import { PerspectiveProvider } from "./PerspectiveContext";
import { PerspectiveControl } from "./components/PerspectiveControl";

const messages = { home: enHome };

// Isolate each test: selection persists to sessionStorage and the URL, so reset
// both so cases never leak the perspective into one another.
beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

function Readout() {
  const { perspective } = usePerspective();
  return <p data-testid="current">{perspective}</p>;
}

function renderControl(initial?: "candidate" | "employer") {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PerspectiveProvider initialPerspective={initial}>
        <PerspectiveControl />
        <Readout />
      </PerspectiveProvider>
    </NextIntlClientProvider>,
  );
}

describe("parsePerspective", () => {
  it("accepts the two valid perspectives and rejects anything else", () => {
    expect(parsePerspective("candidate")).toBe("candidate");
    expect(parsePerspective("employer")).toBe("employer");
    expect(parsePerspective("admin")).toBeNull();
    expect(parsePerspective(null)).toBeNull();
    expect(parsePerspective(undefined)).toBeNull();
  });
});

describe("PerspectiveControl (keyboard-accessible switching)", () => {
  it("defaults to candidate and exposes aria-pressed state", () => {
    renderControl("candidate");
    expect(screen.getByTestId("current")).toHaveTextContent("candidate");
    const candidateBtn = screen.getByRole("button", {
      name: enHome.hero.perspective.candidate,
    });
    expect(candidateBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("switches the shared perspective on click", async () => {
    const user = userEvent.setup();
    renderControl("candidate");
    await user.click(
      screen.getByRole("button", { name: enHome.hero.perspective.employer }),
    );
    expect(screen.getByTestId("current")).toHaveTextContent("employer");
    expect(
      screen.getByRole("button", {
        name: enHome.hero.perspective.employer,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches with the arrow keys (keyboard accessibility, spec §13.4)", async () => {
    const user = userEvent.setup();
    renderControl("candidate");
    const candidateBtn = screen.getByRole("button", {
      name: enHome.hero.perspective.candidate,
    });
    candidateBtn.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("current")).toHaveTextContent("employer");
  });
});

describe("PerspectiveProvider hydration-safe restore", () => {
  it("restores the persisted perspective after mount when the server made no choice", () => {
    window.sessionStorage.setItem("mha:home:perspective", "employer");
    renderControl(); // no ?view, no prop — the SSR default is candidate
    expect(screen.getByTestId("current")).toHaveTextContent("employer");
  });

  it("lets an explicit ?view choice override a stored perspective", () => {
    window.sessionStorage.setItem("mha:home:perspective", "employer");
    window.history.replaceState(null, "", "/?view=candidate");
    renderControl("candidate");
    expect(screen.getByTestId("current")).toHaveTextContent("candidate");
  });
});
