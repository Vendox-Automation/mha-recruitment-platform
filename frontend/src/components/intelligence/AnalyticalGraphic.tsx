import { cn } from "@/lib/cn";

/**
 * Original abstract analytical graphic derived from MHA colour tokens
 * (spec §5.1, §12.6 "abstract MHA-coloured analytical forms"). Pure SVG using
 * the data-series tokens — no photography, no stock imagery, no fabricated
 * data. Decorative, so marked `aria-hidden`.
 */
export function AnalyticalGraphic({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 280"
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid scaffold — architectural reference lines */}
      <g stroke="var(--border-default)" strokeWidth="1" opacity="0.6">
        {[60, 110, 160, 210].map((y) => (
          <line key={y} x1="40" y1={y} x2="380" y2={y} />
        ))}
        {[40, 125, 210, 295, 380].map((x) => (
          <line key={x} x1={x} y1="40" x2={x} y2="240" />
        ))}
      </g>

      {/* Abstract ascending columns (data-series tokens) */}
      <g>
        <rect x="70" y="150" width="34" height="90" rx="3" fill="var(--data-series-1)" />
        <rect x="140" y="120" width="34" height="120" rx="3" fill="var(--data-series-2)" />
        <rect x="210" y="95" width="34" height="145" rx="3" fill="var(--data-series-3)" />
        <rect x="280" y="70" width="34" height="170" rx="3" fill="var(--data-series-1)" opacity="0.85" />
      </g>

      {/* Trend line over the columns */}
      <polyline
        points="87,150 157,120 227,95 297,70"
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [87, 150],
        [157, 120],
        [227, 95],
        [297, 70],
      ].map(([cx, cy]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r="4" fill="var(--surface-canvas)" stroke="var(--brand-primary)" strokeWidth="2.5" />
      ))}
    </svg>
  );
}
