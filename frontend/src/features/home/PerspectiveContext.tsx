"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
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
// Same-tab writes don't fire the native `storage` event, so the provider
// broadcasts this custom event when it changes the URL/storage; the external
// store subscribers re-read the snapshot in response.
const CHANGE_EVENT = "mha:home:perspective-change";

/** Client snapshot: URL (`?view=`) first, then sessionStorage, then fallback. */
function readClientPerspective(fallback: Perspective): Perspective {
  const fromUrl = parsePerspective(
    new URLSearchParams(window.location.search).get(QUERY_KEY),
  );
  if (fromUrl) return fromUrl;
  return (
    parsePerspective(window.sessionStorage.getItem(STORAGE_KEY)) ?? fallback
  );
}

function subscribePerspective(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CHANGE_EVENT, onStoreChange);
}

interface PerspectiveContextValue {
  perspective: Perspective;
  setPerspective: (value: Perspective) => void;
}

const PerspectiveContext = createContext<PerspectiveContextValue | null>(null);

export function PerspectiveProvider({
  children,
  initialPerspective,
}: {
  children: ReactNode;
  /** Optional server-resolved default (from the page's `?view=` searchParam). */
  initialPerspective?: Perspective;
}) {
  const fallback: Perspective = initialPerspective ?? "candidate";

  // useSyncExternalStore keeps the SSR and first client render identical (server
  // snapshot = the page's explicit `?view=` choice, or the candidate default),
  // then reflects any perspective the reader persisted earlier this session —
  // WITHOUT a hydration mismatch (React re-renders instead of erroring). This is
  // why storage/URL are never read during render initialisation (spec §13.4: the
  // SSR default stays meaningful before JS).
  const perspective = useSyncExternalStore(
    subscribePerspective,
    () => readClientPerspective(fallback),
    () => fallback,
  );

  const setPerspective = useCallback((value: Perspective) => {
    if (typeof window === "undefined") return;
    // Persist without a navigation (no scroll jump, no history spam): mirror to
    // sessionStorage and update the URL query in place, then notify subscribers.
    try {
      window.sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage can be unavailable (private mode); the URL still carries state.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(QUERY_KEY, value);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
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
