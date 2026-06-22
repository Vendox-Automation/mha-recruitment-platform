/**
 * Vendox brand mark — gradient "V", recreated as inline SVG (the operator's own
 * logo; used as the featured slot in the trusted-by band). Pass `aria-hidden`
 * when a visible "Vendox" wordmark sits beside it so it is treated as decorative.
 */
export function VendoxMark({
  className,
  title = "Vendox",
  "aria-hidden": ariaHidden,
}: {
  className?: string;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  const decorative = ariaHidden === true || ariaHidden === "true";
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
