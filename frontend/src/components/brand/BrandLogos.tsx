/**
 * Shared inline-SVG brand marks for the operator's own brands (Vendox, MHA,
 * Woodee, WEWE). These are RECREATED approximations of each logo drawn as clean,
 * transparent-background inline SVGs — they are not the exact production assets.
 * To swap in a real asset later, change that brand's registry entry in
 * {@link BRAND_LOGOS} to a component that renders an <img> instead.
 *
 * Each mark follows a shared prop contract: when `aria-hidden` is set the SVG is
 * decorative (no role/aria-label, so a visible wordmark beside it carries the
 * name); otherwise it is a standalone image with role="img" + aria-label=title.
 * Every gradient uses a UNIQUE id so multiple marks can render on one page
 * without `url(#…)` collisions.
 */
import type { ComponentType } from "react";

type BrandMarkProps = {
  className?: string;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

function isDecorative(ariaHidden: BrandMarkProps["aria-hidden"]): boolean {
  return ariaHidden === true || ariaHidden === "true";
}

/** Vendox — gradient chevron "V" (the operator's own logo). */
export function VendoxMark({
  className,
  title = "Vendox",
  "aria-hidden": ariaHidden,
}: BrandMarkProps) {
  const decorative = isDecorative(ariaHidden);
  return (
    <svg
      viewBox="0 0 120 120"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vendox-mark" x1="0.15" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#27B7F0" />
          <stop offset="0.55" stopColor="#7A4FE0" />
          <stop offset="1" stopColor="#D21FE0" />
        </linearGradient>
      </defs>
      {/* Thick chevron "V". */}
      <path
        d="M14 24 L41 24 L60 76 L79 24 L106 24 L60 106 Z"
        fill="url(#vendox-mark)"
      />
    </svg>
  );
}

/** MHA — two overlapping triangular "A" glyphs, green (left) + blue (right). */
export function MhaMark({
  className,
  title = "MHA",
  "aria-hidden": ariaHidden,
}: BrandMarkProps) {
  const decorative = isDecorative(ariaHidden);
  return (
    <svg
      viewBox="0 0 120 120"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left "A" (green), apex left of centre. */}
      <path d="M44 100 L66 20 L88 100 L73 100 L66 70 L59 100 Z" fill="#33A02C" />
      {/* Right "A" (blue), apex right of centre — overlaps ~28% in the middle. */}
      <path d="M32 100 L54 20 L76 100 L61 100 L54 70 L47 100 Z" fill="#1559A8" />
    </svg>
  );
}

/** Woodee — stylised flame with an inner tongue, amber base to deep red tip. */
export function WoodeeMark({
  className,
  title = "Woodee",
  "aria-hidden": ariaHidden,
}: BrandMarkProps) {
  const decorative = isDecorative(ariaHidden);
  return (
    <svg
      viewBox="0 0 120 120"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="woodee-flame" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D6361A" />
        </linearGradient>
      </defs>
      {/* Outer flame teardrop. */}
      <path
        d="M60 12 C76 38 92 50 92 74 a32 32 0 0 1 -64 0 C28 52 44 44 52 30 C56 44 66 48 64 60 C72 52 70 36 60 12 Z"
        fill="url(#woodee-flame)"
      />
      {/* Inner tongue. */}
      <path
        d="M60 58 C68 70 72 78 72 86 a12 12 0 0 1 -24 0 C48 76 54 70 60 58 Z"
        fill="#FCD34D"
      />
    </svg>
  );
}

/** WEWE — two overlapping upward arrowheads forming a dynamic "W". */
export function WeweMark({
  className,
  title = "WEWE",
  "aria-hidden": ariaHidden,
}: BrandMarkProps) {
  const decorative = isDecorative(ariaHidden);
  return (
    <svg
      viewBox="0 0 120 120"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wewe-arrows" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* Darker arrowhead behind. */}
      <path d="M30 92 L54 28 L70 64 L62 80 L51 54 L42 92 Z" fill="#1E40AF" />
      {/* Brighter arrowhead in front, offset right — together they read as "W". */}
      <path d="M50 92 L74 28 L98 92 L80 92 L72 60 L64 92 Z" fill="url(#wewe-arrows)" />
    </svg>
  );
}

/**
 * Brand registry keyed by slug. Swap a value for an <img>-rendering component to
 * use a real asset without touching call sites.
 */
export const BRAND_LOGOS: Record<string, ComponentType<BrandMarkProps>> = {
  vendox: VendoxMark,
  mha: MhaMark,
  woodee: WoodeeMark,
  wewe: WeweMark,
};

/**
 * Renders the registered brand mark for `slug`, or `null` when unknown. Pass
 * `aria-hidden` (the default expectation) when a visible brand name sits beside
 * the mark, so the SVG is treated as decorative.
 */
export function BrandLogo({
  slug,
  className,
  title,
  "aria-hidden": ariaHidden,
}: BrandMarkProps & { slug: string }) {
  const Mark = BRAND_LOGOS[slug];
  if (!Mark) return null;
  return <Mark className={className} title={title} aria-hidden={ariaHidden} />;
}
