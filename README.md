# Ardeis — Technical Consultancy

Single-page marketing site for Ardeis, built from the design handoff in
[`design_handoff_ardeis_site/`](design_handoff_ardeis_site/).

## Stack

| | |
|---|---|
| Framework | **Next.js 16.3** (App Router, Turbopack) |
| React | **19.2** |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Scroll choreography | GSAP 3.15 + ScrollTrigger |
| Smooth scroll | Lenis 1.3 |
| Generative art | Canvas 2D (no library) |

```bash
npm run dev     # dev server, Turbopack
npm run build   # production build
npm run lint
```

## Decisions worth knowing before you edit

**React Compiler is off, deliberately.** The canvas scene and every scroll
handler mutate refs and DOM styles per frame, outside React's model.
Auto-memoization gains nothing there and adds a Babel pass. Don't enable
`reactCompiler` without re-measuring.

**Lenis needs no `scrollerProxy`.** It drives the real window scroll, so
ScrollTrigger only has to be told the position changed:
`lenis.on("scroll", ScrollTrigger.update)` plus `gsap.ticker.add(...)`. A proxy
is for Lenis mounted on a custom wrapper and would fight the actual scroller.
See [smooth-scroll.tsx](src/lib/scroll/smooth-scroll.tsx).

**Pinning is CSS `position: sticky`, never ScrollTrigger's `pin`.** The tall
`380vh` / `320vh` containers plus a sticky inner panel do the pinning;
ScrollTrigger is a *progress source only* (`scrub: true`, no `pin`). Turning on
`pin` would wrap the element in a pin-spacer, switch it to `position: fixed`,
fight the sticky layout and disturb tab order. See
[use-section-progress.ts](src/lib/scroll/use-section-progress.ts).

**The heron is ported, not reimplemented.** [heron-scene.ts](src/lib/canvas/heron-scene.ts)
transcribes ~40 hand-tuned bezier/ellipse coordinates from the prototype's
`genart/heron-scene.js` — beak angle, crest stroke, the 1.25px eye dot. They are
not parametric. Retyping them from scratch draws a different bird. `drawHeron`
is exported at module scope so the loader's silhouette reuses the same art.

**The scene separates composition from canvas extent.** `compositionRatio`
(default `1` = the original, untouched) says what fraction of the canvas the
sky, tree, heron and ripples occupy. Below `1`, those keep their size and
position while the river continues to the bottom of a taller canvas — so
growing the canvas adds *water* rather than scaling the bird. Everything in the
scene is otherwise proportional to canvas height, which is why simply making
the canvas taller would enlarge and lower the heron.

**The scene runs its own rAF loop, off GSAP's ticker.** It is cursor-driven, not
scroll-driven; two independent loops is correct. Two things the prototype
lacked, because the render is expensive (a full `getImageData` on the offscreen
buffer plus a second on the heron mask each frame, then one `fillText` per grid
cell — the 10×14px cell size is why it stays affordable):

- an IntersectionObserver stops it entirely once the hero leaves the viewport;
- under `prefers-reduced-motion` it paints one resting frame and never loops.

**Two CSS cascade-layer calls, in opposite directions** — both intentional, see
the comments in [globals.css](src/app/globals.css). The base reset is inside
`@layer base`; an unlayered universal `padding: 0` would beat every Tailwind
spacing utility, since unlayered rules win over layered ones regardless of
specificity. The hover treatments are deliberately *unlayered* for the same
reason inverted: `.cta:hover { color: … }` must override the element's own
`text-inherit` utility.

**Per-frame values never go through React state.** The single piece of real
state on the page is `caseIdx` (which case study is open, `-1` when closed).
Scroll progress, cursor position and canvas state live in refs.

**Every animated resource has symmetric teardown.** Strict Mode double-mounts
in dev; `HeronScene.start()/stop()`, the Lenis instance and every
`ScrollTrigger.create` are torn down in their effect cleanup. Verified at
runtime: exactly 1.000 canvas draws per frame at 60fps, and 0 while the hero is
scrolled out. If something looks doubled, suspect a missing teardown before
blaming dev-mode weirdness.

## Landing layouts

Still being chosen. `?v=` selects one; **no param is `scale`**, the shipping
default. See [layout-variants.ts](src/lib/layout-variants.ts).

| `?v=` | what it is |
|---|---|
| `scale` *(default)* | the handoff layout with the wordmark at 1.5× |
| `current` | the handoff layout exactly as delivered |
| `plane` | wordmark inside the scene, standing in the water |
| `bleed` | horizontal scope band, wordmark set to the full measure |

**`plane` geometry is derived, not hand-tuned.** The canvas runs to the black
bar, so the bar and nav land on the bottom edge of the viewport, and the scene
holds a `compositionRatio` of 0.53 so the tree and heron keep the size they had
while everything below them becomes water. The wordmark and intro copy share
that water as a single flex column: copy pinned at the bottom, wordmark centred
in what's left. That is what guarantees the type can never touch the tree or
the bird — an anchored offset looks right at one viewport and overlaps at the
next, because the type is sized in `vw` but placed in canvas height. The type
also carries a `vh` cap for the same reason, and this variant drops the
handoff's 720px minimum height, which would otherwise push the nav below the
fold on a 1366×768 laptop.

Verified clear at 1280×800, 1366×640, 1440×900, 1600×720 and 1920×1080.

## Choreography reference

Progress thresholds are load-bearing. The container heights *are* the scroll
budget — shortening them without re-tuning collapses the deliberate dwells.

**The Practice** (`#studio`, 380vh) — [Practice.tsx](src/components/practice/Practice.tsx)

| phase | progress | what happens |
|---|---|---|
| word reveal | 0 → 0.42 | words rise and fade up from a ghosted `opacity: 0.12` rest state |
| dwell | 0.42 → 0.62 | nothing moves; the pause is deliberate |
| cross-slide | 0.62 → 0.78 | sentence exits left, discipline table enters right |
| table dwell | 0.78 → 1 | also deliberate |

Each word's clip wrapper carries a soft gradient mask, **removed once the word
is fully revealed** — without that, descenders stay permanently feathered.

**Selected Work** (`#work`, 320vh) — [WorkShelf.tsx](src/components/work/WorkShelf.tsx)

After a 10% dead zone: `spread` (0 → 0.5) fans the spines out from their
clustered right-aligned rest positions to evenly spaced ones; `fly` (0.5 → 1)
translates the whole grid up to `-130vw`, fading past `fly > 0.7`. The handoff
README documents only the translate — the spread phase comes from the prototype
source. Base positions are measured with transforms cleared and re-measured on
viewport change; measuring a transformed element compounds offsets per frame.

**Contact** — [Contact.tsx](src/components/contact/Contact.tsx) — the reveal is
tied to distance from the **bottom of the document**, not the section's own top.
The section is shorter than the viewport, so its top can never reach 0; a
section-relative model leaves the cover permanently half-drawn.

## Accessibility

Gaps flagged in the handoff are closed rather than carried over:

- `prefers-reduced-motion` skips the word reveal, cross-slide, shelf
  translation and fly-in, rendering final states directly.
- The case overlay is a real dialog: `aria-modal`, Escape, focus moved in on
  open and **returned to the originating spine** on close (both the Escape and
  button paths), `inert` on the page behind and on the overlay when closed.
- The back affordance is a real `<button>`, not an `<a href="#">`.
- Chevrons keep their unstyled look but gain `:focus-visible` rings and
  accessible names.
- Every hover treatment is mirrored on `:focus-visible`.
- The custom cursor only mounts for a fine, hover-capable pointer with motion
  not reduced; `cursor: none` is scoped to that same condition, so the native
  cursor is never taken away without a replacement.

## Mobile

Desktop-first, as designed. Below `768px` the choreography is not created at
all, **and the tall containers collapse to `h-auto`** — skipping the triggers
without collapsing the heights would leave screens of empty scrolling. The
shelf becomes horizontally scrollable, vertical writing modes and the custom
cursor drop out, and the discipline table renders as a normal stacked grid.

Narrow viewports still want a proper design pass; this is a sane fallback, not
a designed mobile layout.
