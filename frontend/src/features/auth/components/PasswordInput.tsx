"use client";

import { useTranslations } from "next-intl";
import { forwardRef, useState } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { fieldBase } from "@/components/ui/Input";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

/**
 * Password input with an accessible show/hide toggle (spec §14.6). The toggle
 * is a real button with a localised label and announces the current state so it
 * is usable by keyboard and screen readers.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ invalid, className, ...props }, ref) {
    const t = useTranslations("auth");
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={cn(
            fieldBase,
            "h-11 pr-24",
            invalid ? "border-status-danger" : "border-border-strong",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {visible ? t("signIn.hidePassword") : t("signIn.showPassword")}
          <span className="absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
            {visible
              ? t("validation.passwordVisible")
              : t("validation.passwordHidden")}
          </span>
        </button>
      </div>
    );
  },
);
