"use client";

import { useCallback, useEffect, useRef } from "react";
import { disciplines, PRACTICE_SENTENCE } from "@/lib/data";
import { useChoreographyEnabled } from "@/lib/motion/use-media";
import { useSectionProgress } from "@/lib/scroll/use-section-progress";
import { useSmoothScroll } from "@/lib/scroll/smooth-scroll";
import { Chevron } from "./Chevron";

const WORDS = PRACTICE_SENTENCE.split(/\s+/).filter(Boolean);
const WORD_MASK =
  "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * The Practice — a four-phase, scroll-scrubbed sequence inside a 380vh
 * container whose inner panel is pinned with CSS `position: sticky`:
 *
 *   1. word reveal   p 0 → 0.42
 *   2. dwell         p 0.42 → 0.62   (nothing moves; the pause is deliberate)
 *   3. cross-slide   p 0.62 → 0.78   (sentence exits left, table enters right)
 *   4. table dwell   p 0.78 → 1      (also deliberate)
 *
 * The 380vh height IS the scroll budget for this choreography — shortening it
 * without re-tuning the thresholds above collapses the two dwells.
 */
export function Practice() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sentenceRef = useRef<HTMLParagraphElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const chevAref = useRef<HTMLButtonElement>(null);
  const chevBref = useRef<HTMLButtonElement>(null);
  const chevBclipRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const clipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const enabled = useChoreographyEnabled();
  const { scrollBy } = useSmoothScroll();

  /**
   * Chevron B's vertical position is computed, not hardcoded: it sits at the
   * midpoint between the bottom of the stage and the bottom of the main row,
   * so it reads as centred between the table and the bottom rule.
   */
  const positionChevB = useCallback(() => {
    const row = rowRef.current;
    const stage = stageRef.current;
    const clip = chevBclipRef.current;
    if (!row || !stage || !clip) return;
    const rowR = row.getBoundingClientRect();
    const stageR = stage.getBoundingClientRect();
    const mid = stageR.bottom + (rowR.bottom - stageR.bottom) / 2;
    clip.style.top = `${mid - rowR.top - 9}px`;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    positionChevB();
    const ro = new ResizeObserver(positionChevB);
    if (rowRef.current) ro.observe(rowRef.current);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", positionChevB);
    const t = window.setTimeout(positionChevB, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", positionChevB);
      window.clearTimeout(t);
    };
  }, [enabled, positionChevB]);

  const onProgress = useCallback((p: number) => {
    const n = WORDS.length;
    const q = Math.min(1, p / 0.42);
    const slideP = clamp01((p - 0.62) / 0.16);

    for (let i = 0; i < n; i++) {
      const word = wordRefs.current[i];
      const clip = clipRefs.current[i];
      if (!word) continue;
      const wp = clamp01((q * 1.15 - i / n) * n * 0.35);
      if (clip) {
        // The mask has to come off once a word is fully revealed, or its
        // descenders and cap-heights stay permanently feathered.
        const m = wp >= 1 ? "none" : WORD_MASK;
        clip.style.maskImage = m;
        clip.style.webkitMaskImage = m;
      }
      word.style.opacity = String(0.12 + 0.88 * wp);
      word.style.transform = `translateY(${((1 - wp) * 28).toFixed(1)}%)`;
    }

    const txt = sentenceRef.current;
    const tbl = tableRef.current;
    if (txt && tbl) {
      txt.style.transform = `translateX(${(-slideP * 60).toFixed(2)}%)`;
      txt.style.opacity = String(1 - slideP);
      tbl.style.transform = `translateX(${((1 - slideP) * 45).toFixed(2)}%)`;
      tbl.style.opacity = String(slideP);
      // Keep the faded-out layer out of the tab order and off the a11y tree.
      txt.style.visibility = slideP >= 1 ? "hidden" : "visible";
      tbl.style.visibility = slideP <= 0 ? "hidden" : "visible";
    }

    // Chevron A arrives when the sentence finishes and retreats as soon as the
    // slide starts; Chevron B only once the table has fully settled.
    const chevA = clamp01((q - 0.97) / 0.03) * Math.max(0, 1 - slideP * 4);
    const chevB = clamp01((slideP - 0.9) / 0.1);
    if (chevAref.current) {
      chevAref.current.style.transform = `translate(-50%,${((1 - chevA) * 300).toFixed(1)}%)`;
      chevAref.current.tabIndex = chevA > 0.5 ? 0 : -1;
    }
    if (chevBref.current) {
      chevBref.current.style.transform = `translate(-50%,${((1 - chevB) * 300).toFixed(1)}%)`;
      chevBref.current.tabIndex = chevB > 0.5 ? 0 : -1;
    }
  }, []);

  useSectionProgress(sectionRef, onProgress, enabled);

  /** Convert a target progress value back into a scroll delta. */
  const jumpToProgress = useCallback(
    (targetP: number) => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const curP = clamp01(-r.top / total);
      scrollBy((targetP - curP) * total);
    },
    [scrollBy],
  );

  return (
    <div
      id="studio"
      ref={sectionRef}
      className="relative max-md:h-auto md:h-[380vh]"
    >
      <div className="flex flex-col overflow-hidden px-4 md:sticky md:top-0 md:h-screen">
        {/* No border: the space-filling rule beside the label is the only line
            these rows need — a full-width hairline as well read as a doubled
            line at two different heights. */}
        <div className="flex items-center gap-6 py-[18px]">
          <div className="overflow-hidden">
            <h2 className="text-[14px] font-semibold whitespace-nowrap">
              Who We Are
            </h2>
          </div>
          {/* A real rule rather than a run of dashes, so it fills whatever
              space is left instead of being sized by its character count. */}
          <span aria-hidden="true" className="h-px flex-1 bg-practice-rule" />
        </div>

        <div
          ref={rowRef}
          className="relative flex-1 max-md:py-12 md:grid md:grid-cols-12 md:items-center"
        >
          <div
            ref={stageRef}
            className="relative max-md:space-y-12 md:col-start-2 md:col-end-12"
          >
            <p
              ref={sentenceRef}
              className="text-[clamp(34px,4.6vw,88px)] leading-[1.14] font-normal tracking-[-.02em] text-pretty"
            >
              {WORDS.map((w, i) => (
                <span key={`${w}-${i}`}>
                  <span
                    ref={(el) => {
                      clipRefs.current[i] = el;
                    }}
                    // The clip box only exists to hide the rising word. With
                    // choreography off there is nothing to hide, and an
                    // overflow-hidden inline-block at line-height 1.14 shears
                    // the ascenders and descenders off every line.
                    className={
                      enabled
                        ? "inline-block overflow-hidden align-bottom leading-[1.14]"
                        : "inline"
                    }
                    style={
                      enabled
                        ? {
                            maskImage: WORD_MASK,
                            WebkitMaskImage: WORD_MASK,
                          }
                        : undefined
                    }
                  >
                    <span
                      ref={(el) => {
                        wordRefs.current[i] = el;
                      }}
                      className={enabled ? "inline-block" : "inline"}
                      style={
                        enabled
                          ? { opacity: 0.12, willChange: "transform, opacity" }
                          : undefined
                      }
                    >
                      {w}
                    </span>
                  </span>{" "}
                </span>
              ))}
            </p>

            {/* Only the internal edges are drawn — the outer perimeter stays
                open, so the four cells read as a plus, not a boxed table. The
                cross arms are intentionally unequal; the proportions come from
                the grid. */}
            <div
              ref={tableRef}
              // 2×2 at every width — the cells fit on a phone once the label
              // steps down, and the cross reads far better than four stacked
              // rows.
              //
              // The min-height is what makes it read as a cross at all: left to
              // its content the grid is ~112px tall against 343px wide, so the
              // horizontal arm runs three times the vertical one and the two
              // rules look unrelated rather than crossed.
              className={
                enabled
                  ? "absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-0"
                  : "grid min-h-[280px] grid-cols-2 grid-rows-2 md:min-h-0"
              }
              style={enabled ? { transform: "translateX(45%)" } : undefined}
            >
              {disciplines.map((d, i) => (
                <div
                  key={d.num}
                  // Internal edges only, at every width — the open perimeter is
                  // what makes the four cells read as a plus rather than a
                  // boxed table. Padding starts at 12px so a phone cell keeps
                  // room for the longest label.
                  className={[
                    "flex flex-col justify-center gap-2",
                    i === 0
                      ? "border-r-[1.5px] border-b-[1.5px] border-ink pr-[clamp(12px,2vw,32px)] pb-[clamp(12px,2vw,32px)]"
                      : i === 1
                        ? "border-b-[1.5px] border-ink pb-[clamp(12px,2vw,32px)] pl-[clamp(12px,2vw,32px)]"
                        : i === 2
                          ? "border-r-[1.5px] border-ink pt-[clamp(12px,2vw,32px)] pr-[clamp(12px,2vw,32px)]"
                          : "pt-[clamp(12px,2vw,32px)] pl-[clamp(12px,2vw,32px)]",
                  ].join(" ")}
                >
                  <span className="text-[12px] font-semibold uppercase">
                    {d.num}
                  </span>
                  {/* Steps down on phones so "Software Engineering" still fits
                      on one line without being abbreviated. */}
                  <span className="text-[15px] leading-[1.1] font-normal tracking-[-.02em] whitespace-nowrap md:text-[clamp(22px,2.7vw,44px)]">
                    {d.label.replace(/ /g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {enabled && (
            <>
              <div className="relative col-start-12 col-end-13 h-[18px] w-[26px] justify-self-center overflow-hidden">
                <Chevron
                  ref={chevAref}
                  direction="right"
                  label="Skip to the disciplines"
                  onClick={() => jumpToProgress(0.85)}
                />
              </div>
              <div
                ref={chevBclipRef}
                className="absolute left-1/2 h-[18px] w-[24px] -translate-x-1/2 overflow-hidden"
              >
                <Chevron
                  ref={chevBref}
                  direction="down"
                  label="Continue to selected work"
                  onClick={() => jumpToProgress(1.12)}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-6 py-[18px]">
          <span aria-hidden="true" className="h-px flex-1 bg-practice-rule" />
          <div className="overflow-hidden">
            <span className="block text-[14px] font-medium whitespace-nowrap">
              Strategy &amp; Philosophy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
