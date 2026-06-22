"use client";

import { useId } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

/** A filled-or-empty star glyph. Decorative — the meaning is in the label. */
function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={cn("h-[1em] w-[1em] shrink-0", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.79L10 14.77l-5.2 2.73 1-5.79L1.58 7.62l5.82-.85L10 1.5z" />
    </svg>
  );
}

export interface StarRatingProps {
  /** Average / fixed rating to display (may be fractional, e.g. 4.3). */
  value: number;
  /** Accessible label, e.g. "4.3 out of 5". */
  label: string;
  /** Star size; defaults to a body-text-sized glyph. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

/**
 * Read-only star rating display. Exposed to assistive tech as a single
 * `role="img"` with the "{value} out of 5" label; the individual stars are
 * decorative. Fractional values fill whole stars and never animate.
 */
export function StarRating({
  value,
  label,
  size = "md",
  className,
}: StarRatingProps) {
  const rounded = Math.round(value);
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 text-status-warning",
        SIZE[size],
        className,
      )}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} filled={star <= rounded} />
      ))}
    </span>
  );
}

export interface RatingInputProps {
  /** Currently selected rating, or 0 when nothing is chosen yet. */
  value: number;
  /** Called with the chosen 1–5 rating. */
  onChange: (rating: number) => void;
  /** Accessible group label (legend). */
  legend: string;
  /** Builds each option's accessible label, e.g. "3 out of 5". */
  optionLabel: (rating: number) => string;
  /** Marks the group invalid + wires `aria-describedby` to the error. */
  invalid?: boolean;
  /** Id of the element describing the field (error / hint) for a11y. */
  describedById?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Interactive 1–5 rating input with radio-group semantics. Each star is a real
 * radio so the control is keyboard-operable (Arrow keys move + select, the
 * roving-tabindex pattern) and announced as a grouped choice. No animation.
 */
export function RatingInput({
  value,
  onChange,
  legend,
  optionLabel,
  invalid,
  describedById,
  disabled,
  name,
}: RatingInputProps) {
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const stars = [1, 2, 3, 4, 5];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(5, (value || 0) + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(1, (value || 1) - 1);
    } else if (event.key === "Home") {
      next = 1;
    } else if (event.key === "End") {
      next = 5;
    }
    if (next !== null) {
      event.preventDefault();
      onChange(next);
    }
  }

  return (
    <fieldset
      className="m-0 border-0 p-0"
      aria-describedby={describedById}
      aria-invalid={invalid || undefined}
      disabled={disabled}
    >
      <legend className="sr-only">{legend}</legend>
      <div
        role="radiogroup"
        aria-label={legend}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center gap-1 text-2xl text-status-warning"
      >
        {stars.map((star) => {
          const selected = star === value;
          // Roving tabindex: only the selected (or first when none) is tabbable.
          const tabbable = value ? selected : star === 1;
          return (
            <label
              key={star}
              className={cn(
                "cursor-pointer rounded-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={star}
                checked={selected}
                disabled={disabled}
                tabIndex={tabbable ? 0 : -1}
                onChange={() => onChange(star)}
                className="sr-only"
              />
              <span className="sr-only">{optionLabel(star)}</span>
              <Star filled={value ? star <= value : false} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
