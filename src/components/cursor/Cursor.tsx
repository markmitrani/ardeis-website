"use client";

import { useEffect, useRef } from "react";
import { useHasFinePointer, useReducedMotion } from "@/lib/motion/use-media";

/**
 * The site cursor: a small accent dot that tracks the pointer closely and a
 * larger ring that trails it with easing. Both use `mix-blend-mode: difference`
 * so they stay legible over cream, olive and near-black alike.
 *
 * Elements opt in with `data-cursor` — bare to grow the ring, or
 * `data-cursor="label:pull"` to grow it and show a label.
 *
 * Only mounts for a fine, hover-capable pointer with motion not reduced. The
 * native cursor is left alone otherwise, and `globals.css` only applies
 * `cursor: none` while this component has flagged itself active on <body>.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const finePointer = useHasFinePointer();
  const reduced = useReducedMotion();
  const active = finePointer && !reduced;

  useEffect(() => {
    if (!active) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    document.body.dataset.customCursor = "on";

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const cur = { dx: mouse.x, dy: mouse.y, rx: mouse.x, ry: mouse.y };
    let big = false;

    const setLabel = (txt: string) => {
      const on = txt || big;
      ring.style.width = on ? "64px" : "34px";
      ring.style.height = on ? "64px" : "34px";
      ring.style.background = txt ? "hsl(175,60%,68%)" : "transparent";
      label.textContent = txt || "";
      label.style.opacity = txt ? "1" : "0";
      dot.style.opacity = txt ? "0" : "1";
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-cursor]");
      if (!t) return;
      big = true;
      const m = (t.getAttribute("data-cursor") || "").match(/label:([a-z]+)/i);
      setLabel(m ? m[1] : "");
    };

    const onOut = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-cursor]");
      if (!t) return;
      const related = e.relatedTarget as Element | null;
      if (related?.closest?.("[data-cursor]")) return;
      big = false;
      setLabel("");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);

    let raf = 0;
    const loop = () => {
      // The dot tracks tightly; the ring lags, which is what reads as weight.
      cur.dx += (mouse.x - cur.dx) * 0.35;
      cur.dy += (mouse.y - cur.dy) * 0.35;
      cur.rx += (mouse.x - cur.rx) * 0.16;
      cur.ry += (mouse.y - cur.ry) * 0.16;
      dot.style.transform = `translate(${cur.dx}px,${cur.dy}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${cur.rx}px,${cur.ry}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      delete document.body.dataset.customCursor;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div aria-hidden="true">
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-9999 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-accent"
        style={{
          pointerEvents: "none",
          transform: "translate(-50%,-50%)",
          mixBlendMode: "difference",
          transition:
            "width .2s var(--ease-ring), height .2s var(--ease-ring), background .2s",
        }}
      >
        <span
          ref={labelRef}
          className="text-[9px] font-semibold tracking-[.14em] text-ink uppercase opacity-0"
        />
      </div>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-9999 h-[5px] w-[5px] rounded-full bg-accent"
        style={{
          pointerEvents: "none",
          transform: "translate(-50%,-50%)",
          mixBlendMode: "difference",
          transition: "opacity .2s",
        }}
      />
    </div>
  );
}
