"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/motion/use-media";

type SmoothScrollApi = {
  /** Scroll to an absolute document offset, honouring the active scroller. */
  scrollTo: (target: number | string | HTMLElement, immediate?: boolean) => void;
  /** Scroll by a delta from the current position. */
  scrollBy: (delta: number) => void;
  lock: () => void;
  unlock: () => void;
};

const noop = () => {};
const SmoothScrollContext = createContext<SmoothScrollApi>({
  scrollTo: noop,
  scrollBy: noop,
  lock: noop,
  unlock: noop,
});

export function useSmoothScroll(): SmoothScrollApi {
  return useContext(SmoothScrollContext);
}

/**
 * Lenis in its default (window) mode, wired to GSAP's ticker.
 *
 * Lenis drives the real window scroll here, so ScrollTrigger needs no
 * scrollerProxy — it only needs to be told when the scroll position changed.
 * A proxy would be for a Lenis instance mounted on a custom wrapper element,
 * and adding one here would fight the actual scroller.
 *
 * Under prefers-reduced-motion, Lenis is never constructed: native scroll is
 * both the accessible choice and a perfectly good source of truth for
 * ScrollTrigger.
 */
export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Plugins are registered here rather than at module scope so this never
    // runs during SSR or on a server component's module graph.
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) return;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Symmetric teardown — Strict Mode mounts this twice in dev, and a
    // half-torn-down Lenis would leave a second ticker callback driving a
    // destroyed instance.
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off("scroll", onScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  // Stable identity: every method reads lenisRef at call time, so the context
  // value never needs to change and consumers never re-render because of it.
  const api: SmoothScrollApi = useMemo(
    () => ({
    scrollTo: (target, immediate = false) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, { immediate });
        return;
      }
      if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: immediate ? "auto" : "smooth" });
      } else if (typeof target === "string") {
        document
          .querySelector(target)
          ?.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
      } else {
        target.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
      }
    },
    scrollBy: (delta) => {
      const lenis = lenisRef.current;
      const top = window.scrollY + delta;
      if (lenis) lenis.scrollTo(top);
      else window.scrollTo({ top, behavior: "smooth" });
    },
    lock: () => {
      lenisRef.current?.stop();
      document.body.style.overflow = "hidden";
    },
    unlock: () => {
      lenisRef.current?.start();
      document.body.style.overflow = "";
    },
    }),
    [],
  );

  return (
    <SmoothScrollContext.Provider value={api}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
