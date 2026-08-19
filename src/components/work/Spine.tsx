"use client";

import type { Work } from "@/lib/data";

/**
 * A book-spine card. The inner panel is the warm near-black `--color-panel`
 * (#2d2b26), deliberately not pure black and deliberately distinct from the
 * `--color-rule` hairline near-black around it.
 */
export function Spine({
  work,
  index,
  onOpen,
}: {
  work: Work;
  index: number;
  onOpen: (index: number, el: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      data-cursor="label:pull"
      data-idx={index}
      onClick={(e) => onOpen(index, e.currentTarget)}
      aria-label={`Open case study — ${work.title}, ${work.meta}, ${work.year}`}
      className="spine flex w-[clamp(72px,6.4vw,120px)] border border-rule bg-transparent p-[4px] text-inherit"
    >
      <span className="flex min-w-0 flex-1 flex-col items-center justify-between bg-panel py-4">
        <span className="text-[12px] font-light tracking-[.1em] text-cream-55">
          {work.num}
        </span>
        <span
          // Steps down on phones: set vertically, a long title like "Batch PDF
          // Watermarker" runs the full height of the spine at 22px and collides
          // with the meta line below it.
          className="spine-title text-[16px] font-regular tracking-[-.01em] text-cream-page md:text-[clamp(22px,2.2vw,40px)]"
          style={{ writingMode: "vertical-rl" }}
        >
          {work.title}
        </span>
        <span
          className="text-[10px] font-light text-cream-50 uppercase md:text-[11px]"
          style={{ writingMode: "vertical-rl" }}
        >
          {work.meta}
        </span>
      </span>
    </button>
  );
}
