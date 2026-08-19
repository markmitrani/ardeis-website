"use client";

import { forwardRef } from "react";

/**
 * The two advance affordances. Both are intentionally light-weight and tightly
 * stacked — thin strokes, a 3px overlap, 70% opacity — so they read as a single
 * "»" or "⌄" rather than two separate arrows.
 *
 * Each starts translated fully outside its parent's overflow-hidden clip box,
 * so it appears to emerge from nothing rather than fading in.
 */
type ChevronProps = {
  direction: "right" | "down";
  label: string;
  onClick: () => void;
};

export const Chevron = forwardRef<HTMLButtonElement, ChevronProps>(
  function Chevron({ direction, label, onClick }, ref) {
    const isRight = direction === "right";

    const glyph = isRight ? (
      <svg width="10" height="18" viewBox="0 0 10 18" fill="none" aria-hidden="true">
        <path
          d="M1.5 1.5l7 7.5-7 7.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".7"
        />
      </svg>
    ) : (
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden="true">
        <path
          d="M2 1.5l8 7 8-7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".7"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={label}
        data-cursor=""
        className="chevron-btn absolute top-0 left-1/2"
        style={{
          flexDirection: isRight ? "row" : "column",
          gap: isRight ? "1px" : undefined,
          transform: "translate(-50%,300%)",
          transition: "transform .55s var(--ease-chevron)",
        }}
      >
        {glyph}
        <span style={isRight ? { marginLeft: -3 } : { marginTop: -3 }}>
          {glyph}
        </span>
      </button>
    );
  },
);
