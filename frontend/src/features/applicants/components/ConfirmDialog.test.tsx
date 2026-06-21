import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// The shared Button transitively imports @/i18n/navigation (→ next/navigation),
// which the jsdom resolver can't load; mock it fully (see testing-stack notes).
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
  usePathname: () => "/",
  redirect: vi.fn(),
  getPathname: vi.fn(),
}));

import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Test harness wiring a real opener button to the dialog so we can verify focus
 * restoration on close (a11y review A-B2).
 */
function Harness({ onConfirm }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmDialog
        open={open}
        title="Confirm rejection"
        description="This cannot be undone."
        confirmLabel="Reject"
        cancelLabel="Keep"
        onConfirm={() => {
          onConfirm?.();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

describe("ConfirmDialog", () => {
  it("moves initial focus to the confirm button on open", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "Reject" })).toHaveFocus();
  });

  it("traps Tab focus within the dialog (last wraps to first)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    const cancel = screen.getByRole("button", { name: "Keep" });
    const confirm = screen.getByRole("button", { name: "Reject" });

    // Focus starts on confirm (last). Tab should wrap to the first (cancel).
    await user.tab();
    expect(cancel).toHaveFocus();

    // Shift+Tab on the first wraps back to the last (confirm).
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores focus to the opener when closed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);

    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
  });
});
