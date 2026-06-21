"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { type Perspective, parsePerspective } from "./perspective";

/**
 * Shared homepage perspective state (spec §13.3 perspective states, §5.2
 * dual-perspective experience). Lifting the candidate/employer choice into one
 * provider lets the hero, value panel, console, journey, and final CTA all
 * respond to a single selection in sync — without separate disconnected
 * sub-pages (spec §5.2 "must not create separate disconnected websites").
 *
 * Integrity / accessibility notes:
 *  - Both perspectives' content stays semantically present in the DOM; selection
 *    only changes emphasis, copy, and which cards are highlighted. Nothing is
 *    removed from assistive tech beyond an inactive `hidden` tabpanel.
 *  - The choice is persisted to the URL (`?view=`) and `sessionStorage` so a
 *    shared link or a page refresh keeps the reader's context (spec §13.4
 *    "URL or session state may preserve the chosen perspective where helpful").
 *  - SSR renders a useful default (candidate) so content is meaningful before
 *    JavaScript hydrates (spec §13.4 "content remains useful before JS").
 */

const STORAGE_KEY = "mha:home:perspective";
const QUERY_KEY = "view";

interface PerspectiveContextValue {
  perspective: Perspective;
  setPerspective: (value: Perspective) => void;
}

const PerspectiveContext = createContext<PerspectiveContextValue | null>(null);

/**
 * Resolve the initial perspective from (in priority order) an explicit prop,
 * the `?view=` query parameter, then `sessionStorage`. Falls back to
 * `candidate`. Read once during render initialisation — no effect — so there is
 * no post-hydration flash beyond what the URL/storage already imply.
 */
function resolveInitial(initial: Perspective | undefined): Perspective {
  if (initial) return initial;
  if (typeof window !== "undefined") {
    const fromUrl = parsePerspective(
      new URLSearchParams(window.location.search).get(QUERY_KEY),
    );
    if (fromUrl) return fromUrl;
    const fromStorage = parsePerspective(
      window.sessionStorage.getItem(STORAGE_KEY),
    );
    if (fromStorage) return fromStorage;
  }
  return "candidate";
}

export function PerspectiveProvider({
  children,
  initialPerspective,
}: {
  children: ReactNode;
  /** Optional server-resolved default (from the page's `?view=` searchParam). */
  initialPerspective?: Perspective;
}) {
  const [perspective, setPerspectiveState] = useState<Perspective>(() =>
    resolveInitial(initialPerspective),
  );

  const setPerspective = useCallback((value: Perspective) => {
    setPerspectiveState(value);
    if (typeof window === "undefined") return;
    // Persist without a navigation (no scroll jump, no history spam): update the
    // URL query in place and mirror to sessionStorage for refresh continuity.
    try {
      window.sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage can be unavailable (private mode); the URL still carries state.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(QUERY_KEY, value);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const value = useMemo(
    () => ({ perspective, setPerspective }),
    [perspective, setPerspective],
  );

  return (
    <PerspectiveContext.Provider value={value}>
      {children}
    </PerspectiveContext.Provider>
  );
}

/** Read the shared homepage perspective. Must be used within the provider. */
export function usePerspective(): PerspectiveContextValue {
  const ctx = useContext(PerspectiveContext);
  if (!ctx) {
    throw new Error("usePerspective must be used within a PerspectiveProvider");
  }
  return ctx;
}

// Re-export the server-safe primitives so existing client consumers can keep
// importing them from this module.
export { type Perspective, PERSPECTIVES, parsePerspective } from "./perspective";
