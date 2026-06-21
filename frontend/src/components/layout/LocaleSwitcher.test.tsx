import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import enCommon from "@/messages/en/common.json";

const replace = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/jobs",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

import { LocaleSwitcher } from "./LocaleSwitcher";

function renderSwitcher(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: enCommon }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The switcher reads the live URL query inside the click handler.
    window.history.replaceState(
      {},
      "",
      "/en/jobs?keyword=engineer&sort=relevant&page=2",
    );
  });

  it("preserves the full query string when switching locale (L-B3)", async () => {
    const user = userEvent.setup();
    renderSwitcher(<LocaleSwitcher />);

    await user.click(screen.getByRole("button", { name: "简体中文" }));

    expect(replace).toHaveBeenCalledTimes(1);
    const [href, options] = replace.mock.calls[0];
    expect(href).toMatchObject({
      pathname: "/jobs",
      query: { keyword: "engineer", sort: "relevant", page: "2" },
    });
    expect(options).toEqual({ locale: "zh-CN" });
  });

  it("does nothing when the active locale is reselected", async () => {
    const user = userEvent.setup();
    renderSwitcher(<LocaleSwitcher />);

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(replace).not.toHaveBeenCalled();
  });
});
