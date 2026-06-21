import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

import type { ButtonSize, ButtonVariant } from "./Button";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold " +
  "transition-colors duration-150 select-none no-underline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-brand-on-primary hover:bg-brand-primary-strong",
  secondary:
    "border border-border-strong bg-surface-canvas text-text-primary hover:bg-surface-subtle",
  ghost: "text-brand-primary hover:bg-brand-primary-soft",
  danger: "bg-status-danger text-white hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * A button-styled, locale-aware link (spec §9.1 navigation, §17.2 locale
 * preservation). Uses the next-intl `Link` so route + locale are kept on
 * navigation. Use this for navigational calls to action; use {@link Button}
 * for in-page actions.
 */
export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
