"use client";

import { useEffect, useRef, useState } from "react";
import { createLoaderRenderer } from "@/lib/canvas/loader-canvas";
import { useReducedMotion } from "@/lib/motion/use-media";
import { useSmoothScroll } from "@/lib/scroll/smooth-scroll";

const DURATION = 1500;
/** Hard ceiling: the page must never stay locked behind a stalled loader. */
const BAILOUT = 2600;

/**
 * Covers the initial paint while the hero canvas warms up. The page beneath is
 * not scrollable until it completes, then it lifts away upwards.
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  const reduced = useReducedMotion();
  const { lock, unlock } = useSmoothScroll();

  useEffect(() => {
    let finished = false;
    let raf = 0;
    let bail = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (barRef.current) barRef.current.style.width = "100%";
      if (pctRef.current) pctRef.current.textContent = "100";
      const root = rootRef.current;
      if (root && !reduced) {
        root.style.transition = "transform .8s var(--ease-loader)";
        root.style.transform = "translateY(-100%)";
      }
      unlock();
      // Fires as the curtain starts lifting, not after it has gone, so the
      // landing text rises in behind the loader instead of waiting for an
      // empty beat and then animating into an already-visible page.
      onDone();
      window.setTimeout(() => setGone(true), reduced ? 0 : 820);
    };

    lock();

    if (reduced) {
      finish();
      return () => {
        unlock();
      };
    }

    const canvas = canvasRef.current;
    const renderer = canvas ? createLoaderRenderer(canvas) : null;
    const start = Date.now();

    const step = () => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(1)}%`;
      if (pctRef.current)
        pctRef.current.textContent = String(Math.floor(p * 100)).padStart(2, "0");
      renderer?.draw(p);
      if (p >= 1) finish();
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    bail = window.setTimeout(finish, BAILOUT);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(bail);
      renderer?.dispose();
      unlock();
    };
    // lock/unlock are stable for the life of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, onDone]);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[9000] overflow-hidden bg-rule"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute right-4 bottom-[60px] left-4 h-px bg-cream-16">
        <div ref={barRef} className="h-full w-0 bg-cream-page" />
      </div>
      <div className="absolute right-4 bottom-[28px] left-4 flex items-center justify-between">
        <span className="text-[12px] font-medium text-cream-50 uppercase">
          Ardeis®
        </span>
        <span
          ref={pctRef}
          className="text-[11px] tracking-[.1em] text-cream-page tabular-nums"
        >
          00
        </span>
      </div>
    </div>
  );
}
