import { cn } from "@/lib/cn";

export interface KeywordDatum {
  label: string;
  count: number;
}

/**
 * Original horizontal-bar analytical graphic for real "roles in focus" /
 * "skills" keyword frequencies (spec §12.6 original analytical graphics,
 * §13.7 "data visualisations include textual summaries"). Pure SVG built from
 * the data-series tokens — no charting dependency, no fabricated data.
 *
 * The SVG itself is `aria-hidden`; the caller MUST render the accompanying
 * textual list (the same data as words + counts) so the information is never
 * conveyed by the visual alone. Bars are sized relative to the busiest entry.
 */
export function KeywordBars({
  data,
  className,
}: {
  data: KeywordDatum[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const rowHeight = 26;
  const gap = 8;
  const height = data.length * rowHeight + (data.length - 1) * gap;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 320 ${Math.max(height, 1)}`}
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((datum, index) => {
        const y = index * (rowHeight + gap);
        const width = Math.max(6, (datum.count / max) * 320);
        return (
          <rect
            key={datum.label}
            x="0"
            y={y}
            width={width}
            height={rowHeight}
            rx="4"
            fill={`var(--data-series-${(index % 6) + 1})`}
            opacity={1 - index * 0.08}
          />
        );
      })}
    </svg>
  );
}
