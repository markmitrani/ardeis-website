"use client";

import { useEffect, useRef } from "react";
import { HeroCanvas } from "./HeroCanvas";
import { scopes } from "@/lib/data";
import { useReducedMotion } from "@/lib/motion/use-media";
import {
  DEFAULT_VARIANT,
  PLANE_COMPOSITION_RATIO,
  PLANE_WORDMARK_TOP,
  TECH_SIZE,
  WORDMARK_SIZE,
  type LayoutVariant,
} from "@/lib/layout-variants";

/**
 * A soft cream field behind the intro copy so it stays readable over the
 * water. Centred on the golden section of its own box rather than the middle,
 * which puts the densest cream under the last two lines where the text mass
 * sits, and lets the field fall off to nothing at the edges instead of ending
 * on a visible seam. Stated as rgba, not `transparent` — `transparent` is
 * rgba(0,0,0,0) and interpolates through grey.
 */
const INTRO_MASK =
  "radial-gradient(ellipse at 61.8% 61.8%, rgba(244,240,234,1) 0%, rgba(244,240,234,0) 100%)";

const NAV_LINKS = [
  { href: "#studio", label: "Studio" },
  { href: "#work", label: "Work" },
  { href: "#contact", label: "Contact" },
];

const INTRO =
  "We're a technical consultancy that works across disciplines. From design to deployment, Ardeis is there for the whole process.";

function quintOut(x: number) {
  return 1 - Math.pow(1 - x, 5);
}

const REVEAL_DUR = 900;

/**
 * The landing entrance. Runs once, after the loader has lifted away.
 *
 * Scope rows slide in from the left, each starting when the previous is 38%
 * through. Every other piece of text in the section rises out of its own clip
 * box on the same 900ms quintic ease-out — same speed and curve, rotated from
 * left-to-right to bottom-to-top.
 *
 * The clip boxes are built here rather than in the markup so the JSX stays
 * readable: wrapping a dozen labels by hand would bury the layout. That is
 * only safe because this section does not re-render after the reveal plays —
 * React would otherwise discard the injected wrappers.
 */
type RevealItem =
  | { kind: "row"; el: HTMLElement; delay: number }
  | { kind: "fade"; el: HTMLElement; delay: number }
  | { kind: "slide"; inner: HTMLElement; clip: HTMLElement; delay: number };

function useLandingReveal(
  containerRef: React.RefObject<HTMLElement | null>,
  play: boolean,
) {
  const reduced = useReducedMotion();
  const itemsRef = useRef<RevealItem[] | null>(null);

  /* -------- 1. Hide, at mount -------- *
   * This has to happen while the loader still covers the page. Setting the
   * from-state when `play` flips instead means the finished layout is on
   * screen for the whole 0.8s curtain lift, and then visibly snaps away to
   * animate back in.                                                        */
  useEffect(() => {
    if (reduced) return;
    const root = containerRef.current;
    if (!root) return;

    const items: RevealItem[] = [];
    const restore: (() => void)[] = [];

    const rowStagger = REVEAL_DUR * 0.38;
    Array.from(root.querySelectorAll<HTMLElement>(".scope-row")).forEach(
      (el, i) => {
        el.style.transform = "translateX(-110%)";
        el.style.willChange = "transform";
        items.push({ kind: "row", el, delay: 400 + i * rowStagger });
        restore.push(() => {
          el.style.transform = "";
          el.style.willChange = "auto";
        });
      },
    );

    const targets = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (el) => {
        if (el.tagName === "CANVAS") return false;
        if (el.closest(".scope-row")) return false;
        if (el.closest("[data-noreveal]")) return false;
        if (el.children.length) return false;
        return (el.textContent || "").trim().length > 0;
      },
    );

    targets.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });

    targets.forEach((el, i) => {
      const cs = getComputedStyle(el);
      const delay = 300 + i * 40;

      // Vertical writing modes (the outlined "Tech", the coordinates) have no
      // sensible "up" — a translateY would slide them along their own reading
      // axis. They fade on the same clock instead.
      if (cs.writingMode.startsWith("vertical")) {
        el.style.opacity = "0";
        items.push({ kind: "fade", el, delay });
        restore.push(() => {
          el.style.opacity = "";
        });
        return;
      }

      const blockish =
        cs.display === "block" ||
        cs.display === "flex" ||
        cs.display === "list-item";

      const clip = document.createElement("span");
      clip.style.display = blockish ? "block" : "inline-block";
      clip.style.overflow = "hidden";
      if (!blockish) clip.style.verticalAlign = "bottom";
      // Breathing room so negative tracking (the final "s" of Ardeis) is not
      // shaved off by the hug width of the clip.
      clip.style.paddingRight = ".12em";
      clip.style.marginRight = "-.12em";

      const inner = document.createElement("span");
      inner.style.display = blockish ? "block" : "inline-block";
      inner.style.willChange = "transform";
      inner.style.transform = "translateY(110%)";
      while (el.firstChild) inner.appendChild(el.firstChild);
      clip.appendChild(inner);
      el.appendChild(clip);

      items.push({ kind: "slide", inner, clip, delay });
      restore.push(() => {
        while (inner.firstChild) el.insertBefore(inner.firstChild, clip);
        clip.remove();
      });
    });

    itemsRef.current = items;
    return () => {
      itemsRef.current = null;
      restore.forEach((fn) => fn());
    };
  }, [containerRef, reduced]);

  /* -------- 2. Play, once the curtain starts lifting -------- */
  useEffect(() => {
    if (!play || reduced) return;
    const items = itemsRef.current;
    if (!items) return;

    const frames: number[] = [];
    const run = (delay: number, apply: (e: number) => void, done: () => void) => {
      const start = performance.now() + delay;
      const step = (now: number) => {
        const p = Math.max(0, Math.min(1, (now - start) / REVEAL_DUR));
        apply(quintOut(p));
        if (p < 1) frames.push(requestAnimationFrame(step));
        else done();
      };
      frames.push(requestAnimationFrame(step));
    };

    items.forEach((item) => {
      if (item.kind === "row") {
        run(
          item.delay,
          (e) => {
            item.el.style.transform = `translateX(${((e - 1) * 110).toFixed(2)}%)`;
          },
          () => {
            item.el.style.transform = "";
            item.el.style.willChange = "auto";
          },
        );
      } else if (item.kind === "fade") {
        run(
          item.delay,
          (e) => {
            item.el.style.opacity = String(e);
          },
          () => {
            item.el.style.opacity = "";
          },
        );
      } else {
        run(
          item.delay,
          (e) => {
            item.inner.style.transform = `translateY(${((1 - e) * 110).toFixed(2)}%)`;
          },
          () => {
            item.inner.style.transform = "none";
            item.inner.style.willChange = "auto";
            // Let descenders back out once the word has landed.
            item.clip.style.overflow = "visible";
          },
        );
      }
    });

    return () => frames.forEach((f) => cancelAnimationFrame(f));
  }, [play, reduced]);
}

function ScopeRowContent({ num, name }: { num: string; name: string }) {
  return (
    <>
      {/* Justified like an index: the number holds the left edge, the name is
          flushed right against the divider. Tabular figures keep 01–04 in a
          true column on the left without needing a fixed-width cell.
          Both layers share identical geometry — the fill is a clip-path wipe of
          the same box, so any spacing change has to be made to both. */}
      <div className="absolute inset-0 flex items-center justify-between gap-4 pr-2 pl-2 xl:pr-4">
        <span className="shrink-0 text-[12px] font-medium tracking-[.08em] tabular-nums">
          {num}
        </span>
        <span className="min-w-0 truncate text-right text-[clamp(14px,1.1vw,18px)] font-medium tracking-[-.01em]">
          {name}
        </span>
      </div>
      <div className="scope-fill absolute inset-0 flex items-center justify-between gap-4 bg-rule pr-4 pl-2">
        <span className="shrink-0 text-[12px] font-medium tracking-[.08em] text-accent tabular-nums">
          {num}
        </span>
        <span className="min-w-0 truncate text-right text-[clamp(14px,1.1vw,18px)] font-medium tracking-[-.01em] text-cream-page">
          {name}
        </span>
      </div>
    </>
  );
}

/** The handoff's scope index: a vertical column of four rows. */
function ScopeColumn() {
  return (
    // Wider at tablet: at 2/12 the column leaves the name ~64px, which clips
    // every label except "Design". It only earns the narrow 2/12 once there is
    // enough total width for it.
    <div className="flex flex-col overflow-hidden md:col-span-3 md:border-r md:border-rule lg:col-span-2">
      {/* Desktop only — on mobile the 2×2 grid butts straight against the
          navbar's bottom rule, which already reads as its boundary. */}
      <div className="flex items-center justify-end border-b border-rule py-2 pr-2 max-md:hidden xl:pr-4">
        <span className="text-[12px] font-normal tracking-[.08em] uppercase">
          Scope
        </span>
      </div>
      {/* Mobile lays the four out 2×2 — as full-width rows the justified
          number and name sat at opposite edges of the screen with a stretched
          void between them. Desktop keeps the single column: `contents`
          dissolves this wrapper so the rows stay flex children of the column
          and their flex-1 heights still work. */}
      <div className="grid grid-cols-2 md:contents">
        {scopes.map((s) => (
          <a
            key={s.num}
            href="#work"
            data-cursor=""
            // 48px, not the bare 44px touch minimum — clears the floor and
            // lands on the grid. On mobile the odd cells carry the vertical
            // divider and the even cells indent off it.
            className="scope-row relative block min-h-12 flex-1 overflow-hidden border-b border-rule-faint text-inherit no-underline max-md:odd:border-r max-md:[&:nth-child(even)>div]:pl-4"
          >
            <ScopeRowContent num={s.num} name={s.name} />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Scope laid out as a horizontal band, so the wordmark can take full width. */
function ScopeStrip() {
  return (
    <div className="shrink-0 border-b border-rule md:grid md:grid-cols-12">
      <span className="flex items-center py-[10px] text-[12px] font-normal tracking-[.08em] uppercase md:col-span-2 md:border-r md:border-rule">
        Scope
      </span>
      {scopes.map((s) => (
        <a
          key={s.num}
          href="#work"
          data-cursor=""
          className="scope-row relative block h-12 overflow-hidden pl-4 text-inherit no-underline max-md:border-t max-md:border-rule-faint md:col-span-2 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-rule-faint"
        >
          <ScopeRowContent num={s.num} name={s.name} />
        </a>
      ))}
    </div>
  );
}

function Coordinates() {
  return (
    <span
      className="text-[12px] font-medium tracking-[.14em] uppercase max-md:hidden"
      style={{ writingMode: "vertical-rl" }}
    >
      52.37°N · 04.90°E
    </span>
  );
}

/** Ardeis + the outlined vertical Tech, sized per variant. */
function Wordmark({ variant }: { variant: LayoutVariant }) {
  return (
    <>
      <h1
        className="leading-[.84] font-bold tracking-[-.045em]"
        style={{ fontSize: WORDMARK_SIZE[variant] }}
      >
        Ardeis
      </h1>
      <span
        className="pb-[clamp(4px,1vh,12px)] leading-none font-bold tracking-[.02em] max-md:hidden"
        style={{
          fontSize: TECH_SIZE[variant],
          writingMode: "vertical-rl",
          // The fill IS the page colour — that is what makes this read as
          // outlined type rather than a cream letterform sitting on the page.
          // It has to track the background token, not a fixed cream.
          color: "var(--color-page)",
          WebkitTextStroke: "1.5px var(--color-ink)",
          paintOrder: "stroke fill",
        }}
      >
        Tech
      </span>
    </>
  );
}

export function Landing({
  revealed,
  variant = DEFAULT_VARIANT,
}: {
  revealed: boolean;
  variant?: LayoutVariant;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  useLandingReveal(sectionRef, revealed);

  const isPlane = variant === "plane";
  const isBleed = variant === "bleed";

  return (
    <section
      ref={sectionRef}
      // On mobile the floor is a full viewport (svh, so the browser's own
      // toolbars are accounted for) — at a flat 720px the landing came up
      // ~30px short of the screen and let the Practice section peek in before
      // any scrolling.
      //
      // The handoff's 720px floor would push the nav below the fold on a
      // 1366×768 laptop, and `plane` is defined by the bar and nav landing on
      // the bottom edge — so that variant drops the floor at desktop widths
      // and lets the canvas take the hit instead.
      className={`relative flex min-h-svh flex-col px-4 md:h-screen ${
        isPlane ? "md:min-h-0" : "md:min-h-[720px]"
      }`}
      aria-label="Landing"
    >
      {/* Hero canvas. In `plane` it runs all the way down to the black bar and
          holds the wordmark and the intro copy, so the scene is the page
          rather than a panel above it. */}
      <div className="relative min-h-[320px] flex-1 md:min-h-0">
        <HeroCanvas
          compositionRatio={isPlane ? PLANE_COMPOSITION_RATIO : 1}
        />

        {/* The water band: everything from the bottom of the composition down
            to the black bar. Declaring it as one column — copy pinned at the
            bottom, wordmark centred in whatever is left — means the two can
            never collide, whatever the viewport shape. Anchoring the type by a
            fixed offset instead looks fine at one size and overlaps at the
            next, because it is sized in vw but placed in canvas height. */}
        {isPlane && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col max-md:hidden"
            style={{ top: PLANE_WORDMARK_TOP }}
          >
            <div className="flex flex-1 items-center gap-[clamp(10px,1.4vw,28px)]">
              <Wordmark variant={variant} />
            </div>

            {/* Sits above the black bar on the same 14px rhythm as the gap
                between the bar and the nav. */}
            <div className="mb-[14px] self-end" style={{ background: INTRO_MASK }}>
              {/* A wider measure than the handoff's 32ch: here the copy floats
                  over open water rather than sitting in a narrow column, and
                  at 32ch it wrapped to six lines and swallowed the band the
                  wordmark needs. */}
              <p className="max-w-[42ch] py-6 pr-[30px] pl-24 text-right text-[clamp(13px,1.05vw,17px)] leading-[1.5] font-light text-pretty">
                {INTRO}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="h-[clamp(34px,4.6vh,58px)] shrink-0 bg-ink" />

      {/* Nav spacing is on an 8px grid — every structural value here is a
          Tailwind even step (2=8, 4=16, 6=24). Two exceptions are optical, not
          structural, and are deliberately off-grid: the 2px that hugs the ® to
          the wordmark, and the 3px underline offset on the links.

          Columns stay at the handoff's 1.6fr 1fr 1fr, so the dividers sit where
          they always have. The middle cell is wider than its links, so the
          links cluster tightly and let the slack fall as symmetric breathing
          room on both sides rather than being spread between them.

          An 8px gap now separates the three column boxes, with each side of
          the gap carrying its own rule — so a divider is two hairlines with
          air between them, not one line shared by both columns. The outer
          edges of the first and last columns stay bare; a border there would
          just be a second line on top of the page margin. */}
      <nav className="mt-[8px] shrink-0 md:grid md:grid-cols-[1.6fr_1fr_1fr]">
        {/* In `plane` the wordmark already reads at full size in the scene
            directly above, so the small one here would just repeat it. The
            labels shift up a slot to fill the gap and the nav becomes a single
            uniform 14px register. */}
        {/* Hidden on mobile: stacked, these read as two nearly-empty full-width
            rows, and the wordmark below already says Ardeis at full size. The
            locale and copyright live in the footer, so nothing is lost. */}
        <div className="flex items-center gap-[2px] py-4 max-md:hidden md:border-y md:border-r md:border-rule md:pr-4 md:pl-2 lg:pr-6 2xl:pr-8">
          {isPlane ? (
            <>
              <span className="text-[12px] font-normal tracking-[.08em] uppercase">
                Technical Consultancy
              </span>
              <span className="ml-auto text-[12px] font-normal tracking-[.08em] uppercase">
                Amsterdam
              </span>
            </>
          ) : (
            <>
              <span className="text-[18px] font-bold tracking-[-.02em]">
                Ardeis Tech Solutions
              </span>
              {/* The ® is tuned to hug the wordmark — keep the 2px gap and the
                  flex-start alignment. */}
              <span className="mt-px self-start text-[14px] font-normal tracking-[.14em] uppercase">
                ®
              </span>
              <span className="ml-auto text-[12px] font-normal tracking-[.08em] uppercase">
                Technical Consultancy
              </span>
            </>
          )}
        </div>

        {/* No mobile top border any more — the cell above it is hidden there,
            so it would double up with the nav's own top rule. Tighter padding
            on mobile too: this is the only row left in the bar there, so the
            desktop 16px made it read as a tall empty band. */}
        {/* The cell borders are md-only because they draw the column dividers.
            On mobile this is the sole visible cell, so it carries the bar's
            top and bottom rules itself. */}
        <div className="flex items-center justify-center gap-2 border-y border-rule py-2 md:border-r md:px-4 md:py-4 lg:px-6 2xl:px-8">
          {NAV_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              <a
                href={link.href}
                data-cursor=""
                className="nav-link pb-[3px] text-[14px] font-semibold tracking-[.06em] no-underline"
              >
                {link.label}
              </a>
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between py-4 max-md:hidden md:border-y md:border-rule md:pr-2 md:pl-4 lg:pl-6 2xl:pl-8">
          {/* No tracking: the handoff letter-spaced this at .14em, which made
              it the only spaced-out label in a nav that is otherwise a uniform
              12px register — it read as a mistake next to TECHNICAL
              CONSULTANCY and ©MMXXVI, both of which are normal. */}
          {!isPlane && (
            <span className="text-[12px] font-normal tracking-[.08em] uppercase">
              Amsterdam
            </span>
          )}
          <span className="ml-auto text-[12px] font-normal tracking-[.08em] uppercase">
            ©MMXXVI
          </span>
        </div>
      </nav>

      {isPlane ? (
        /* Nothing below the canvas on desktop — the black bar and nav land on
           the bottom edge of the viewport. Narrow viewports still need the
           wordmark and copy in normal flow, since the canvas overlay is
           desktop-only. */
        <div className="flex flex-col gap-6 py-8 md:hidden">
          <div className="flex items-end gap-[clamp(10px,1.4vw,28px)]">
            <Wordmark variant={variant} />
          </div>
          <p className="max-w-[42ch] text-[15px] leading-[1.5] font-light text-pretty">
            {INTRO}
          </p>
        </div>
      ) : isBleed ? (
        <>
          <ScopeStrip />
          {/* Full-bleed: the name runs past both gutters and is cropped by the
              viewport, implying it continues outside the frame. */}
          <div className="relative flex shrink-0 items-end overflow-hidden max-md:py-8 md:h-[40vh]">
            <div className="absolute top-3 right-0 max-md:hidden">
              <Coordinates />
            </div>
            <div className="-mx-4 flex w-screen items-end justify-center gap-[clamp(10px,1.4vw,28px)] pb-[clamp(10px,2vh,22px)]">
              <Wordmark variant={variant} />
            </div>
          </div>
          <div className="flex shrink-0 items-end justify-between gap-8 pb-[clamp(10px,2vh,22px)] max-md:flex-col max-md:items-start">
            <p className="max-w-[42ch] text-[clamp(13px,1.05vw,17px)] leading-[1.5] font-light text-pretty">
              {INTRO}
            </p>
            <span className="text-[12px] font-light tracking-[.08em] whitespace-nowrap uppercase">
              More about us ↓
            </span>
          </div>
        </>
      ) : (
        <div
          // No top padding on mobile: the scope grid is the first thing in
          // here and should sit flush under the navbar. No bottom padding
          // either — the copy block below owns the gap to the wordmark.
          className="shrink-0 max-md:pb-0 md:grid md:grid-cols-12"
        >
          <ScopeColumn />

          {/* Below 1024 the wordmark and the copy can no longer share a row —
              the wordmark alone eats the width. They stack instead: wordmark
              left, copy still right-aligned under it. Height goes auto there
              so the taller stack is not clipped by the 41vh row. */}
          <div className="relative flex gap-[clamp(10px,1.4vw,28px)] overflow-hidden pb-[clamp(10px,2vh,22px)] max-lg:pt-8 max-md:pb-0 md:col-span-9 md:h-auto md:flex-col md:items-start md:pl-[clamp(16px,2vw,36px)] lg:col-span-10 lg:h-[41vh] lg:flex-row lg:items-end lg:pt-0">
            <div className="absolute top-3 right-0">
              <Coordinates />
            </div>

            {/* Kept in their own row so "Ardeis" and the vertical "Tech" stay
                side by side even when the parent stacks. */}
            <div className="flex shrink-0 items-end gap-[clamp(10px,1.4vw,28px)]">
              <Wordmark variant={variant} />
            </div>

            <div className="flex flex-col items-end justify-end gap-[14px] pr-[30px] max-md:hidden max-lg:mt-4 max-lg:w-full lg:ml-auto lg:self-stretch">
              {/* Wider measure while stacked: at 32ch the copy runs to five
                  lines, which crowds the wordmark against the scope grid above
                  it. A longer line means fewer of them, and the wordmark can
                  sit lower in the space. */}
              <p className="mt-auto text-right text-[clamp(13px,1.05vw,17px)] leading-[1.5] font-light text-pretty max-lg:max-w-[54ch] lg:max-w-[32ch]">
                {INTRO}
              </p>
              <span className="text-[12px] font-light tracking-[.08em] whitespace-nowrap uppercase">
                More about us ↓
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Intro copy, stacked on narrow viewports where the wordmark row
          collapses. `plane` and `bleed` already carry their own copy. */}
      {!isBleed && !isPlane && (
        <div className="mt-3 flex flex-col gap-6 pb-8 md:hidden">
          <p className="max-w-[42ch] text-[15px] leading-[1.5] font-light text-pretty">
            {INTRO}
          </p>
          {/* Desktop carries this in the wordmark row's right column, which is
              hidden on mobile — so it gets its own, matching that column's
              right alignment. */}
          <span className="self-end text-[12px] font-light tracking-[.08em] whitespace-nowrap uppercase">
            More about us ↓
          </span>
        </div>
      )}
    </section>
  );
}
