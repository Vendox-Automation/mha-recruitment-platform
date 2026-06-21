import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { fieldBase } from "./Input";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Multi-line text input primitive. Mirrors {@link Input} for invalid state. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, className, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          "py-2.5 resize-y",
          invalid ? "border-status-danger" : "border-border-strong",
          className,
        )}
        {...props}
      />
    );
  },
);
