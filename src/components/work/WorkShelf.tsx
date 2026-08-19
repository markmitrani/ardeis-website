"use client";

import { useCallback, useRef } from "react";
import { works } from "@/lib/data";
import { useChoreographyEnabled } from "@/lib/motion/use-media";
import { useSectionProgress } from "@/lib/scroll/use-section-progress";
import { Spine } from "./Spine";

type SpineBase = { n: number; vw: number; lefts: number[] };

/**
 * Selected Work — a two-phase shelf choreography inside a 320vh container.
 *
 * After a 10% dead zone at the top of the section (so the spines don't twitch
 * the instant the section enters):
 *
 *   spread  p 0 → 0.5   the spines fan out from their clustered, right-aligned
 *                       rest positions to evenly spaced positions across the
 *                       full width, between a 16px margin and where the last
 *                       spine already sat.
 *   fly     p 0.5 → 1   the whole grid translates left by up to 130vw, fading
 *                       out over the last 30% of that travel.
 *
 * Base positions are measured once with all transforms cleared, and
 * re-measured whenever the spine count or viewport width changes — measuring a
 * transformed element would compound the offsets frame over frame.
 */
export function WorkShelf({
  onOpenCase,
}: {
  onOpenCase: (index: number, spineEl: HTMLElement) => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SpineBase | null>(null);

  const enabled = useChoreographyEnabled();

  const onProgress = useCallback((pRaw: number) => {
    const inner = innerRef.current;
    const shelf = shelfRef.current;
    if (!inner || !shelf) return;

    // Dead zone: nothing reacts until the section is 10% consumed.
    const p = Math.max(0, (pRaw - 0.1) / 0.9);

    const spines = Array.from(shelf.querySelectorAll<HTMLElement>(".spine"));
    const n = spines.length;
    if (!n) return;

    const base = baseRef.current;
    if (!base || base.n !== n || base.vw !== window.innerWidth) {
      inner.style.transform = "";
      shelf.style.transform = "";
      spines.forEach((sp) => {
        sp.style.transform = "";
      });
      baseRef.current = {
        n,
        vw: window.innerWidth,
        lefts: spines.map((sp) => sp.getBoundingClientRect().left),
      };
    }

    const spread = Math.min(p / 0.5, 1);
    const fly = Math.max(0, (p - 0.5) / 0.5);

    shelf.style.transform = "";
    inner.style.transform = `translateX(${-fly * 130}vw)`;
    inner.style.opacity = String(1 - Math.max(0, (fly - 0.7) / 0.3));

    const b = baseRef.current;
    if (b) {
      const margin = 16;
      const spanEnd = b.lefts[n - 1];
      spines.forEach((sp, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        const target = margin + t * (spanEnd - margin);
        sp.style.transform = `translateX(${((target - b.lefts[i]) * spread).toFixed(2)}px)`;
      });
    }
  }, []);

  useSectionProgress(sectionRef, onProgress, enabled);

  return (
    <div
      id="work"
      ref={sectionRef}
      className="relative max-md:h-auto md:h-[320vh]"
    >
      <div className="flex flex-col overflow-hidden px-4 md:sticky md:top-0 md:h-screen">
        <div
          ref={innerRef}
          // Extra bottom room on mobile: the outlined GET IN TOUCH hangs ~62px
          // up out of the contact section below, and at py-12 it crowded the
          // bottom of the spines.
          className="flex-1 max-md:pt-12 max-md:pb-32 md:grid md:grid-cols-12"
          style={enabled ? { willChange: "transform" } : undefined}
        >
          <div className="flex flex-col justify-between py-[clamp(24px,4vh,48px)] md:col-span-5">
            <h2 className="text-[clamp(56px,7vw,140px)] leading-[.92] font-semibold tracking-[-.04em]">
              Selected
              <br />
              Work
            </h2>
            <span className="text-[12px] font-light uppercase max-md:mt-8">
              2025 — 2026 · Browse the shelf
            </span>
          </div>

          <div
            ref={shelfRef}
            className="flex items-stretch gap-[10px] py-[clamp(24px,4vh,48px)] max-md:h-[60vh] max-md:justify-end max-md:overflow-x-auto md:col-span-7 md:justify-end"
            style={enabled ? { willChange: "transform" } : undefined}
          >
            {works.map((w, i) => (
              <Spine key={w.num} work={w} index={i} onOpen={onOpenCase} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
