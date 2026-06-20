/**
 * "Skip to content" link (spec §23 keyboard navigation). Visually hidden until
 * focused, then appears as a prominent control so keyboard users can bypass the
 * header. The target element must carry `id="main-content"`.
 */
export function SkipToContent({ label }: { label: string }) {
  return (
    <a
      href="#main-content"
      className="absolute left-4 top-4 z-50 -translate-y-20 rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-on-primary transition-transform focus:translate-y-0 focus-visible:translate-y-0"
    >
      {label}
    </a>
  );
}
