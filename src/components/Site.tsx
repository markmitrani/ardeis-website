"use client";

import { useCallback, useRef, useState } from "react";
import { Cursor } from "./cursor/Cursor";
import { Loader } from "./loader/Loader";
import { Landing } from "./landing/Landing";
import { Practice } from "./practice/Practice";
import { WorkShelf } from "./work/WorkShelf";
import { CaseOverlay } from "./work/CaseOverlay";
import { Contact } from "./contact/Contact";
import { SmoothScrollProvider } from "@/lib/scroll/smooth-scroll";
import { DEFAULT_VARIANT, type LayoutVariant } from "@/lib/layout-variants";

function SiteContent({ variant }: { variant: LayoutVariant }) {
  // The only real piece of React state on the page: which case study is open,
  // -1 when closed. Everything else — scroll progress, cursor position, canvas
  // state — lives in refs and is mutated per frame, never through re-renders.
  const [caseIdx, setCaseIdx] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openCase = useCallback((index: number, spineEl: HTMLElement) => {
    triggerRef.current = spineEl;
    setCaseIdx(index);
  }, []);

  const closeCase = useCallback(() => setCaseIdx(-1), []);
  const onLoaderDone = useCallback(() => setRevealed(true), []);

  return (
    <>
      <Cursor />
      <Loader onDone={onLoaderDone} />

      {/* `inert` keeps the page behind the overlay out of the tab order and
          off the accessibility tree while a case study is open. */}
      <div className="relative w-full [overflow-x:clip]" inert={caseIdx >= 0}>
        <Landing revealed={revealed} variant={variant} />
        <Practice />
        <WorkShelf onOpenCase={openCase} />
        <Contact />
      </div>

      <CaseOverlay
        caseIdx={caseIdx}
        onClose={closeCase}
        triggerRef={triggerRef}
      />
    </>
  );
}

export function Site({
  variant = DEFAULT_VARIANT,
}: {
  variant?: LayoutVariant;
}) {
  return (
    <SmoothScrollProvider>
      <SiteContent variant={variant} />
    </SmoothScrollProvider>
  );
}
