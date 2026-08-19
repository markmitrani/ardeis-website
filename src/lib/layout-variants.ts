/**
 * Landing layout variants, for design exploration.
 *
 * Switch with `?v=` — e.g. `/?v=scale`. Everything stays inside the handoff's
 * locked language (palette, Host Grotesk, hairlines, zero radius, no shadows);
 * only the arrangement of the landing's final act changes.
 *
 * Delete this file and the `variant` props once a direction is chosen.
 */
export const LAYOUT_VARIANTS = ["current", "scale", "plane", "bleed"] as const;

export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];

/** The shipping default. `?v=current` still serves the original handoff layout. */
export const DEFAULT_VARIANT: LayoutVariant = "scale";

export function normalizeVariant(value: string | string[] | undefined): LayoutVariant {
  const v = Array.isArray(value) ? value[0] : value;
  return (LAYOUT_VARIANTS as readonly string[]).includes(v ?? "")
    ? (v as LayoutVariant)
    : DEFAULT_VARIANT;
}

/**
 * `plane` geometry.
 *
 * The canvas runs from the top of the viewport down to the black bar, so it is
 * roughly twice the height it had in the handoff layout. The composition —
 * sky, tree, heron, ripples — is held at the fraction below so the bird and
 * the tree keep the size and position they had before; everything under them
 * is extended water, and that water band is where the wordmark goes.
 */
export const PLANE_COMPOSITION_RATIO = 0.53;

/**
 * Top of the water band, as a fraction of canvas height.
 *
 * The heron's ripples are the lowest drawn element of the composition, ending
 * at 0.84 of the composition height. Deriving the band from that — rather than
 * hand-tuning an offset that would drift with the viewport — is what
 * guarantees the type can never cross the tree or the bird.
 */
export const PLANE_WORDMARK_TOP = `${(0.84 * PLANE_COMPOSITION_RATIO * 100).toFixed(1)}%`;

/**
 * Type sizes per variant. The handoff's own scale is `current`; `scale` and
 * `plane` are that scale × 1.5, keeping the same clamp shape so the fluid
 * behaviour is unchanged. `bleed` goes further because it is meant to crop.
 */
export const WORDMARK_SIZE: Record<LayoutVariant, string> = {
  current: "clamp(84px,12.5vw,232px)",
  // 1.5x the handoff, then trimmed to 90% of that — every stop scaled by the
  // same factor so the fluid curve keeps its shape.
  scale: "clamp(113px,16.9vw,313px)",
  // Same 1.5x scale as `scale`, but also capped against viewport height. The
  // type is positioned inside a band measured in canvas height while being
  // sized in vw, so on a wide-but-short screen a width-only rule grows it
  // straight into the intro copy. The vh cap is what keeps the band honest.
  plane: "clamp(126px,min(18.75vw,26vh),348px)",
  // Sized to reach the gutters rather than sit inside them: "Ardeis" runs
  // ~2.6× its font size wide, so ~32vw fills the measure at desktop widths.
  bleed: "clamp(200px,32vw,620px)",
};

export const TECH_SIZE: Record<LayoutVariant, string> = {
  current: "clamp(30px,3.4vw,64px)",
  // 90% of the 1.5x scale, matching the wordmark it sits beside.
  scale: "clamp(41px,4.6vw,86px)",
  // Set vertically, so its four characters make it the *tallest* thing in the
  // band — it needs the same height cap, proportionally tighter.
  plane: "clamp(45px,min(5.1vw,7vh),96px)",
  bleed: "clamp(45px,5.1vw,96px)",
};
