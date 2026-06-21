"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Refined scroll-reveal for public storytelling sections (spec §13.6 "short
 * content reveals", §5.4 "refined reveal transitions"). framer-motion is the
 * single approved motion library (ADR-0001 §1.2).
 *
 * Accessibility (spec §13.7): when the user prefers reduced motion the content
 * is rendered immediately at its final position with NO transform/opacity
 * animation — the information is never conveyed by motion alone and revealed
 * content stays visible. `viewport.once` prevents re-animation on scroll-back,
 * and there is no scroll hijacking — the page scrolls normally and elements
 * simply fade/rise into place as they enter.
 *
 * Uses the lightweight `m` component; the page mounts `LazyMotion` so the full
 * animation feature bundle loads only on the public homepage, keeping motion
 * code out of dashboard bundles (spec §13.8).
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
}: {
  children: ReactNode;
  /** Small stagger (seconds) for sequential emphasis. */
  delay?: number;
  as?: "div" | "li" | "section";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = m[as];

  if (reduceMotion) {
    // Static alternative: final state, no animation (spec §13.7).
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
