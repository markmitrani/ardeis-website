"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChoreographyEnabled } from "@/lib/motion/use-media";

const FOOTER_ITEMS = [
  { label: "Mail", value: "studio@ardeis.tech" },
  { label: "Located", value: "Amsterdam, NL" },
  { label: "KVK", value: "42068635" },
  { label: "All rights reserved", value: "Ardeis Tech Solutions® ©MMXXVI" },
];

/**
 * Contact / footer.
 *
 * This section deliberately breaks the page's typography and palette: Switzer
 * instead of Host Grotesk, and a cream-on-olive scheme independent of the page
 * background. Two distinct darks are in play — #413F38 for the section,
 * #2d2b26 for the footer strip — and neither is pure black.
 *
 * The reveal is tied to distance from the bottom of the document rather than
 * the section's own top. The section is shorter than the viewport, so its top
 * can never scroll to 0 — a section-relative progress model would leave the
 * cover permanently half-drawn.
 */
export function Contact() {
  const coverRef = useRef<HTMLDivElement>(null);
  const gitRef = useRef<HTMLDivElement>(null);
  const enabled = useChoreographyEnabled();

  const update = useCallback(() => {
    const cover = coverRef.current;
    const git = gitRef.current;
    if (!cover || !git) return;

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const remaining = maxScroll - window.scrollY;
    const vis = Math.max(0, Math.min(1, 1 - remaining / (window.innerHeight * 0.65)));

    cover.style.opacity = String(1 - vis);
    git.style.opacity = String(vis);
    git.style.transform = `translate(${((1 - vis) * -140).toFixed(2)}vw, 38.2%)`;
  }, []);

  useEffect(() => {
    const cover = coverRef.current;
    const git = gitRef.current;

    if (!enabled) {
      // Final state, painted directly.
      if (cover) cover.style.opacity = "0";
      if (git) {
        git.style.opacity = "1";
        git.style.transform = "translate(0, 38.2%)";
      }
      return;
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled, update]);

  return (
    <>
      {/* Zero-height wrapper: the headline hangs out of it and tucks behind the
          footer, ~61.8% of the glyph height showing above the top edge. */}
      <div aria-hidden="true" className="relative z-[5] h-0">
        <div
          ref={gitRef}
          // 122px on phones. Anchored by `right`, so growing the type extends
          // it leftward and the right end stays put; the .08em trailing pad
          // scales with it, which keeps the italic's overhang proportional.
          className="font-display absolute right-4 bottom-0 pr-[.08em] text-[122px] leading-[.82] whitespace-nowrap italic md:right-[clamp(16px,4vw,64px)] md:text-[clamp(160px,18vw,360px)]"
          style={{
            transform: "translate(0, 38.2%)",
            color: "transparent",
            WebkitTextStroke: "2px var(--color-ink)",
            opacity: 0,
          }}
        >
          GET IN TOUCH
        </div>
      </div>

      <section
        id="contact"
        className="font-switzer relative z-10 bg-olive px-4 text-cream"
        aria-label="Contact"
      >
        <div className="relative z-[2] grid grid-cols-12 items-center border-b border-cream-18 bg-olive py-[22px]">
          <h2 className="col-span-12 text-[16px] font-medium text-cream uppercase">
            Want to work with us?
          </h2>
        </div>

        <div className="grid grid-cols-12">
          <a
            href="mailto:studio@ardeis.tech"
            data-cursor="label:mail"
            className="cta col-span-12 -ml-4 flex items-center py-[clamp(48px,9vh,120px)] pr-[clamp(20px,2.4vw,48px)] pl-4 text-inherit no-underline transition-colors duration-150 md:col-span-8 md:border-r md:border-cream-18"
          >
            <span className="relative block max-w-[14ch] text-[clamp(34px,5vw,92px)] leading-[1.04] font-medium tracking-[-.035em] text-balance">
              Let&apos;s build something <br></br> awe-inspiring&nbsp;↗
            </span>
          </a>

          <div className="col-span-12 flex flex-col md:col-span-4">
            <div className="flex flex-1 flex-col justify-center gap-2 border-b border-cream-18 py-[26px] md:pl-[clamp(20px,2.4vw,48px)]">
              <span className="text-[12px] font-light text-cream-50 uppercase">
                Availability
              </span>
              <span className="text-[16px] leading-[1.5] font-regular text-cream-85 text-pretty">
                One engagement at a time.
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 py-[26px] md:pl-[clamp(20px,2.4vw,48px)]">
              <span className="text-[12px] font-light text-cream-50 uppercase">
                Process
              </span>
              <span className="text-[16px] leading-[1.5] font-regular text-cream-85 text-pretty">
                A paragraph about what you want to build is enough. We&apos;ll go
                over the details and schedule a kickoff call to align on goals,
                scope, and timeline.
              </span>
            </div>
          </div>
        </div>

        <footer className="relative z-[2] -mx-4 grid grid-cols-2 gap-6 border-t border-cream-18 bg-panel px-4 pt-[22px] pb-[26px] md:grid-cols-4">
          {FOOTER_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className={`flex flex-col gap-1 ${i === FOOTER_ITEMS.length - 1 ? "text-right" : ""}`}
            >
              <span className="text-[12px] font-light text-cream-50 uppercase">
                {item.label}
              </span>
              <span className="text-[18px] font-regular">{item.value}</span>
            </div>
          ))}
        </footer>

        {/* Impersonates the page until the scroll reveal wipes it away, so it
            has to be the page token. The handoff set it to the contact's own
            cream, which was indistinguishable from the old cream page but
            reads as a warm block against white. */}
        <div
          ref={coverRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-page"
        />
      </section>
    </>
  );
}
