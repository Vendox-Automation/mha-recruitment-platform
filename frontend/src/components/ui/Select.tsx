import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { fieldBase } from "./Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native select primitive — accessible and keyboard-operable by default, no
 * custom listbox required for the MVP. A token-coloured chevron is drawn with
 * an inline background image so it inherits the design system.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ invalid, className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          "h-11 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2344556a%22><path d=%22M5.5 7.5L10 12l4.5-4.5%22 stroke=%22%2344556a%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')]",
          invalid ? "border-status-danger" : "border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
