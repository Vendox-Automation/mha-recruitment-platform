"use client";

import type { ReactNode } from "react";

import {
  PerspectiveProvider,
  type Perspective,
} from "../PerspectiveContext";
import { MotionProvider } from "./MotionProvider";

/**
 * Client boundary for the homepage (spec §13). Wraps the whole homepage in the
 * shared {@link PerspectiveProvider} (so every section reacts to one
 * candidate/employer choice) and the {@link MotionProvider} (so framer-motion's
 * feature bundle and reduced-motion config are scoped to this public page only,
 * spec §13.8). The server `page.tsx` stays composition-only and passes its
 * server-rendered section tree through as `children`, keeping content useful
 * before hydration (spec §13.4).
 */
export function HomeProviders({
  children,
  initialPerspective,
}: {
  children: ReactNode;
  initialPerspective?: Perspective;
}) {
  return (
    <PerspectiveProvider initialPerspective={initialPerspective}>
      <MotionProvider>{children}</MotionProvider>
    </PerspectiveProvider>
  );
}
