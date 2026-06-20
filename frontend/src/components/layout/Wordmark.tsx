import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export interface WordmarkProps {
  /** Brand name, e.g. "MHA Jobs" (from messages). */
  label: string;
  /** Accessible "go to homepage" label (localised). */
  homeLabel: string;
  tone?: "default" | "inverse";
  className?: string;
}

/**
 * Text-based MHA identity wordmark (spec §12.2 "use official MHA logo assets" —
 * Phase 1 uses a typographic placeholder; no logo asset is invented). The "MHA"
 * mark is set in brand colour to establish ownership without guessing the final
 * logo geometry. Renders as a homepage link.
 */
export function Wordmark({
  label,
  homeLabel,
  tone = "default",
  className,
}: WordmarkProps) {
  const [mark, ...rest] = label.split(" ");
  const remainder = rest.join(" ");
  return (
    <Link
      href="/"
      aria-label={homeLabel}
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-sm font-semibold tracking-tight no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-base leading-none",
          tone === "inverse"
            ? "bg-text-inverse text-surface-inverse"
            : "bg-brand-primary text-brand-on-primary",
        )}
      >
        {mark}
      </span>
      {remainder ? (
        <span
          className={cn(
            "text-lg",
            tone === "inverse" ? "text-text-inverse" : "text-text-primary",
          )}
        >
          {remainder}
        </span>
      ) : null}
    </Link>
  );
}
