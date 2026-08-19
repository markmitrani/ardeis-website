"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` is the right primitive here: matchMedia is an
 * external store, and this gets a correct server snapshot (false) without
 * writing state from inside an effect, so there is no cascading render on
 * mount and no hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // The server has no viewport and no user preferences; every query resolves
  // false there, which means the first client paint matches the server HTML.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True when the user has asked for reduced motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Desktop breakpoint — the scroll choreography assumes this width. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

/** A real pointer that can hover — the custom cursor's precondition. */
export function useHasFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

/**
 * Whether scroll choreography should run at all: desktop width, motion not
 * reduced, and mounted on the client.
 */
export function useChoreographyEnabled(): boolean {
  const isDesktop = useIsDesktop();
  const reduced = useReducedMotion();
  return isDesktop && !reduced;
}
