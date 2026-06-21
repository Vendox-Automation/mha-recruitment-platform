import { cn } from "@/lib/cn";

export interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Indeterminate progress indicator (spec §13.6 "progress feedback"). The
 * rotation is CSS-only and stilled under reduced-motion; the accessible label
 * keeps the meaning available regardless of motion.
 */
export function Spinner({ label, size = "md", className }: SpinnerProps) {
  const dimension = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "motion-spin rounded-full border-2 border-border-default border-t-brand-primary",
          dimension,
        )}
      />
      <span className="absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
        {label}
      </span>
    </span>
  );
}
