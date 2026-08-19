"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Reports 0 → 1 progress across a tall section whose inner content is pinned
 * with CSS `position: sticky`.
 *
 * The trigger deliberately does NOT use `pin: true`. The design already pins
 * via sticky inside a tall container, and ScrollTrigger's pin would wrap the
 * element in a pin-spacer and switch it to `position: fixed` — fighting the
 * sticky layout, changing the document height out from under the other
 * sections' measurements, and disturbing tab order. Here ScrollTrigger is a
 * progress source and nothing more.
 *
 * The `start: "top top"` / `end: "bottom bottom"` pair reproduces the
 * prototype's `p = -rect.top / (rect.height - innerHeight)` exactly.
 *
 * `onUpdate` is called on every scrub frame — write to refs and mutate styles
 * inside it, never to React state.
 */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  onUpdate: (p: number) => void,
  enabled: boolean,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => onUpdate(self.progress),
      onRefresh: (self) => onUpdate(self.progress),
    });

    // Paint the correct state immediately rather than waiting for first scroll.
    onUpdate(trigger.progress);

    return () => {
      trigger.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, enabled, ...deps]);
}
