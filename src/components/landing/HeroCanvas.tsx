"use client";

import { useEffect, useRef } from "react";
import { HeronScene } from "@/lib/canvas/heron-scene";
import { useReducedMotion } from "@/lib/motion/use-media";

/**
 * Thin wrapper around the ported HeronScene.
 *
 * The scene owns its own requestAnimationFrame loop — it is cursor-driven,
 * never scroll-driven, so it stays off GSAP's ticker and outside React's
 * render cycle. Two independent loops is the correct shape here.
 *
 * Two things the prototype did not do, added because this render is not cheap
 * (a full getImageData on the offscreen buffer plus a second on the heron mask
 * every frame, then one fillText per grid cell — several thousand draws per
 * frame at desktop width):
 *   - pause entirely once the hero scrolls out of view;
 *   - never start the loop at all under prefers-reduced-motion, painting a
 *     single resting frame instead.
 */
export function HeroCanvas({
  compositionRatio = 1,
}: {
  /** See HeronSceneOptions — below 1, the extra canvas height becomes water. */
  compositionRatio?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas needs concrete colour strings, so read them off the design tokens
    // rather than duplicating literals here — the scene's `bg` is the knockout
    // colour for the heron's eye and wing crease, and it has to match the page
    // or those punch-outs stop reading as holes.
    const root = getComputedStyle(document.documentElement);
    const ink = root.getPropertyValue("--color-ink").trim() || "#020202";
    const bg = root.getPropertyValue("--color-page").trim() || "#ffffff";

    const scene = new HeronScene(canvas, {
      artStyle: "blocky",
      cloudCount: 3,
      compositionRatio,
      ink,
      bg,
    });

    if (reduced) {
      // One frame, no loop, no listeners.
      const id = requestAnimationFrame(() => scene.renderStaticFrame());
      return () => cancelAnimationFrame(id);
    }

    scene.start();

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) scene.start();
        else scene.stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    // start()/stop() are symmetric and idempotent, so the Strict Mode double
    // mount in dev cannot leave a second rAF chain or duplicate listeners.
    return () => {
      io.disconnect();
      scene.stop();
    };
  }, [reduced, compositionRatio]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
      {/* The scene is decorative brand texture with no on-page caption, so it
          needs its own text equivalent rather than a generic/missing one. */}
      <span className="sr-only">
        A pixel-art heron standing in a wetland, Ardeis&apos;s studio motif.
      </span>
    </>
  );
}
