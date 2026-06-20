import type { ElementType, ReactNode } from "react";

/**
 * Renders content that is available to screen readers but visually hidden
 * (spec §23 "screen-reader text for icon-only controls"). Uses the standard
 * clip pattern rather than `display:none` so assistive tech still reads it.
 */
export function VisuallyHidden({
  as: Tag = "span",
  children,
}: {
  as?: ElementType;
  children: ReactNode;
}) {
  return (
    <Tag className="absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip:rect(0,0,0,0)]">
      {children}
    </Tag>
  );
}
