"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Scopes framer-motion to the public homepage (spec §13.8 "keep public-page
 * motion code out of dashboards"). `LazyMotion` with `domAnimation` loads only
 * the DOM animation feature set used by the `m` components here, trimming the
 * bundle versus importing the full `motion` API. `MotionConfig
 * reducedMotion="user"` makes every animation honour `prefers-reduced-motion`
 * at the library level as a second line of defence behind each component's own
 * `useReducedMotion` static fallback (spec §13.7).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
