import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./Spinner";

/**
 * Shared layout for the five mandatory user-facing states (CLAUDE.md:
 * loading, empty, error, success, permission-denied). Each named export below
 * is a thin wrapper so call sites read clearly and stay consistent.
 *
 * All copy is passed in by the caller from the message catalogue — these
 * components hold no hardcoded UI strings.
 */

type Tone = "neutral" | "success" | "danger";

interface BaseProps {
  title: ReactNode;
  description?: ReactNode;
  /** A primary action (e.g. retry, browse jobs). */
  action?: ReactNode;
  /** Decorative mark above the title; tokenised, no imagery. */
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  /** Compact variant for in-panel use (e.g. inside a card). */
  compact?: boolean;
}

const toneAccent: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-text-secondary",
  success: "bg-surface-subtle text-status-success",
  danger: "bg-surface-subtle text-status-danger",
};

function StateBlock({
  title,
  description,
  action,
  icon,
  tone = "neutral",
  className,
  compact,
  role,
}: BaseProps & { role?: "status" | "alert" }) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center rounded-lg border border-border-default bg-surface-canvas text-center",
        compact ? "gap-2 p-6" : "gap-3 p-10",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-md font-semibold",
          compact ? "h-9 w-9 text-base" : "h-12 w-12 text-lg",
          toneAccent[tone],
        )}
      >
        {icon ?? "•"}
      </span>
      <h3 className="type-heading-3 text-text-primary">{title}</h3>
      {description ? (
        <p className="type-body-sm max-w-md text-text-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Loading state — skeletons preferred for content, this for whole regions. */
export function LoadingState({
  title,
  description,
  spinnerLabel,
  compact,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Accessible label for the spinner (localised). */
  spinnerLabel: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-border-default bg-surface-canvas p-10 text-center",
        compact && "gap-2 p-6",
        className,
      )}
    >
      <Spinner label={spinnerLabel} />
      <h3 className="type-heading-3 text-text-primary">{title}</h3>
      {description ? (
        <p className="type-body-sm max-w-md text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Empty state — honest "no data yet" with optional next action (spec §14). */
export function EmptyState(props: BaseProps) {
  return <StateBlock role="status" tone="neutral" {...props} />;
}

/** Error state — calm, actionable, never blames the user (spec §17.5). */
export function ErrorState(props: BaseProps) {
  return <StateBlock role="alert" tone="danger" {...props} />;
}

/** Success confirmation (spec §14.7 success screens). */
export function SuccessState(props: BaseProps) {
  return <StateBlock role="status" tone="success" {...props} />;
}

/** Permission-denied state (CLAUDE.md required state; spec §8 role limits). */
export function PermissionDeniedState(props: BaseProps) {
  return <StateBlock role="alert" tone="danger" {...props} />;
}
