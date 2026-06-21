"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

import { PERSPECTIVES } from "../perspective";
import { usePerspective } from "../PerspectiveContext";

/**
 * Equal, keyboard-accessible Candidate / Employer perspective switch (spec
 * §11.2 equal clarity, §13.3, §13.4). Rendered as a labelled button group with
 * `aria-pressed` so both audiences are unmistakable and equally prominent;
 * arrow keys move between the two options for fast keyboard switching while
 * Tab/Enter/Space behave as normal buttons.
 *
 * Selecting an option updates the SHARED perspective (hero copy, CTAs,
 * highlighted console cards, value pillars, journey, and final CTA) without a
 * navigation or scroll jump (spec §13.4 "without disorienting movement").
 */
export function PerspectiveControl({
  size = "md",
  className,
}: {
  size?: "md" | "sm";
  className?: string;
}) {
  const t = useTranslations("home.hero");
  const { perspective, setPerspective } = usePerspective();

  return (
    <div
      role="group"
      aria-label={t("perspectiveLabel")}
      className={cn(
        "inline-flex rounded-md border border-border-strong p-1",
        size === "md" && "w-full max-w-sm",
        className,
      )}
    >
      {PERSPECTIVES.map((value, index) => {
        const selected = value === perspective;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => setPerspective(value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                setPerspective(PERSPECTIVES[(index + 1) % PERSPECTIVES.length]);
              }
            }}
            className={cn(
              "flex-1 rounded-[0.3rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
              size === "md" ? "px-3 py-2 text-sm" : "px-3 py-1.5 text-xs",
              selected
                ? "bg-brand-primary text-brand-on-primary"
                : "text-text-secondary hover:bg-surface-subtle",
            )}
          >
            {t(`perspective.${value}`)}
          </button>
        );
      })}
    </div>
  );
}
