"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { works, type Work } from "@/lib/data";
import { useReducedMotion } from "@/lib/motion/use-media";

/**
 * The case-study image. Extracted so the linked and unlinked branches can
 * never drift apart — the sizing here is load-bearing for the 80% rule.
 */
function CaseImage({
  work,
  containerRef,
}: {
  work: Work;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    // A plain <img>, deliberately: these are author-supplied files of unknown
    // type and dimensions dropped into public/work, and the overlay sizes them
    // by height rather than by intrinsic aspect ratio. It accepts PNG, JPEG,
    // WebP, AVIF, GIF and SVG alike with no per-format configuration.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={work.image}
      alt=""
      // 3px is the minimum that renders `double` as two distinct rules rather
      // than a solid line — it splits into 1px/1px/1px, which keeps it in the
      // hairline register the rest of the site uses.
      className="case-image h-4/5 w-auto max-w-full rounded-[16px] border-[3px] border-double border-case-frame object-contain"
      // A mistyped filename should close the gap, not park a broken image icon
      // in the middle of the case study.
      onError={() => {
        if (containerRef.current) containerRef.current.style.display = "none";
      }}
      onLoad={() => {
        if (containerRef.current) containerRef.current.style.display = "";
      }}
    />
  );
}

/**
 * The case study overlay.
 *
 * Opening flies the clicked spine's title from its position on the shelf to
 * the overlay's title slot — rotating out of the vertical writing mode and
 * scaling up to the display size. The flown element sits above the overlay so
 * it stays opaque while the overlay itself fades in beneath it.
 *
 * The prototype's back affordance was an <a href="#"> behaving like a button;
 * here it is a real button, and the overlay carries dialog semantics the
 * prototype lacked: aria-modal, an Escape handler, focus moved in on open and
 * restored to the triggering spine on close, and `inert` on the page behind.
 */
export function CaseOverlay({
  caseIdx,
  onClose,
  triggerRef,
}: {
  caseIdx: number;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const reduced = useReducedMotion();
  const open = caseIdx >= 0;
  const work = open ? works[caseIdx] : null;

  // Single close path, so Escape and the back button behave identically —
  // in particular both return focus to the spine that opened the overlay.
  const handleClose = useCallback(() => {
    const trigger = triggerRef.current;
    onClose();
    requestAnimationFrame(() => trigger?.focus());
  }, [onClose, triggerRef]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  // Open / close transition.
  useEffect(() => {
    const overlay = overlayRef.current;
    const title = titleRef.current;
    const body = bodyRef.current;
    const fly = flyRef.current;
    if (!overlay || !title || !body || !fly) return;

    if (!open) {
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      body.style.opacity = "0";
      body.style.transform = "translateY(24px)";
      if (imageRef.current) imageRef.current.style.opacity = "0";
      fly.style.display = "none";
      return;
    }

    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";

    const settle = () => {
      if (imageRef.current) imageRef.current.style.opacity = "1";
      title.style.opacity = "1";
      body.style.opacity = "1";
      body.style.transform = "translateY(0)";
      closeRef.current?.focus();
    };

    const spine = triggerRef.current;
    const spineTitle = spine?.querySelector<HTMLElement>(".spine-title");

    if (reduced || !spineTitle || !work) {
      settle();
      return;
    }

    const r = spineTitle.getBoundingClientRect();
    const srcSize = parseFloat(getComputedStyle(spineTitle).fontSize);
    const dest = title.getBoundingClientRect();
    const destSize = parseFloat(getComputedStyle(title).fontSize);

    fly.textContent = work.title;
    fly.style.display = "block";
    fly.style.fontSize = `${srcSize}px`;
    title.style.opacity = "0";

    const sx = r.left + r.width / 2;
    const sy = r.top;
    const dx = dest.left;
    const dy = dest.top;

    const proxy = { p: 0 };
    // power4.inOut is exactly the prototype's quintic in-out.
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 0.9,
      ease: "power4.inOut",
      onUpdate: () => {
        const p = proxy.p;
        const x = sx + (dx - sx) * p;
        const y = sy + (dy - sy) * p;
        const rot = 90 * (1 - p);
        const sc = 1 + (destSize / srcSize - 1) * p;
        fly.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg) scale(${sc})`;
        // Stays ink-coloured for the first instant, while it is still over the
        // page rather than the black overlay.
        fly.style.color =
          p < 0.15 ? "var(--color-ink)" : "var(--color-cream-page)";
      },
      onComplete: () => {
        fly.style.display = "none";
        settle();
      },
    });

    return () => {
      tween.kill();
    };
  }, [open, work, reduced, triggerRef]);

  return (
    <>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        // Belt and braces: an inert subtree cannot hold focus, so the close
        // button can never be left focused-but-hidden after the overlay shuts.
        inert={!open}
        aria-label={work ? `Case study — ${work.title}` : "Case study"}
        className="fixed inset-0 z-[8000] flex flex-col bg-case-bg p-[clamp(24px,3vw,56px)] text-cream-page"
        style={{
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity .5s ease",
        }}
      >
        <span
          ref={titleRef}
          className="text-[clamp(48px,6.5vw,120px)] leading-[.95] font-semibold tracking-[-.035em]"
        >
          {work?.title ?? ""}
        </span>

        {/* Fills the gap between the title and the copy, with the image itself
            at 80% of that height so it stays clear of both. `flex-1` here means
            the body block below no longer needs it — the two would otherwise
            compete for the same free space. */}
        {work?.image && (
          <div
            ref={imageRef}
            // No padding here on purpose: a percentage height resolves against
            // the content box, so padding would come out of the image's 80%
            // and leave it at ~72% of the actual gap. Centring the 80% leaves
            // the remaining 20% split evenly above and below instead.
            className="flex min-h-0 flex-1 items-center justify-center"
            style={{
              opacity: 0,
              transition: "opacity .6s ease .1s",
            }}
          >
            {work.link ? (
              // The anchor has to carry the full height itself: the image's
              // 80% is a percentage, and a shrink-to-fit link between it and
              // the sized container would leave that percentage resolving
              // against its own content.
              <a
                href={work.link}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="label:visit"
                aria-label={`Visit ${work.title} (opens in a new tab)`}
                className="flex h-full items-center justify-center"
              >
                <CaseImage work={work} containerRef={imageRef} />
              </a>
            ) : (
              <CaseImage work={work} containerRef={imageRef} />
            )}
          </div>
        )}

        <div
          ref={bodyRef}
          className={`items-end gap-6 max-md:mt-8 max-md:space-y-8 md:grid md:grid-cols-12 ${
            work?.image ? "" : "flex-1"
          }`}
          style={{
            opacity: 0,
            transform: "translateY(24px)",
            transition:
              "opacity .6s ease .1s, transform .6s var(--ease-enter) .1s",
          }}
        >
          <p className="max-w-[44ch] text-[clamp(16px,1.4vw,22px)] leading-[1.55] text-cream-85 text-pretty md:col-span-5">
            {work?.body ?? ""}
          </p>
          <div className="flex flex-col gap-[10px] md:col-start-7 md:col-end-10">
            <span className="text-[12px] font-semibold text-cream-50 uppercase">
              Stack
            </span>
            <span className="text-[14px] font-medium uppercase">
              {work?.meta ?? ""}
            </span>
          </div>
          <div className="flex flex-col gap-[10px] md:col-start-10 md:col-end-13">
            <span className="text-[12px] font-semibold text-cream-50 uppercase">
              Year
            </span>
            <span className="text-[14px] font-medium">{work?.year ?? ""}</span>
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          data-cursor="label:back"
          aria-label="Close case study"
          className="back-btn absolute right-0 bottom-0 h-[180px] w-[180px] overflow-hidden"
        >
          <span
            aria-hidden="true"
            className="back-tri absolute right-0 bottom-0 h-0 w-0"
            style={{
              borderStyle: "solid",
              borderWidth: "0 0 180px 180px",
              borderColor: "transparent transparent var(--color-cream-page) transparent",
            }}
          />
          <span className="back-label absolute right-[22px] bottom-5 text-[12px] font-semibold text-cream-page uppercase transition-colors duration-300">
            ← Back
          </span>
        </button>
      </div>

      {/* Flies above the overlay so it stays opaque as the overlay fades in. */}
      <div
        ref={flyRef}
        aria-hidden="true"
        className="fixed z-[8100] font-semibold tracking-[-.01em] whitespace-nowrap text-cream-page"
        style={{
          display: "none",
          pointerEvents: "none",
          transformOrigin: "left top",
        }}
      />
    </>
  );
}
