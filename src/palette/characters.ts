/**
 * Characters: the qualitative half of the input (ticket 06).
 *
 * A character is a LOOKUP, not an interpretation. It resolves a name to fixed
 * numeric parameters, which is what keeps the tool deterministic while still
 * letting the input be a word rather than six sliders.
 *
 * All chroma values are GAMUT-RELATIVE (a fraction of the maximum in-gamut
 * chroma at that lightness and hue), per ticket 01: absolute chroma is not
 * hue-portable, and a fixed-chroma ramp gets silently rewritten by the gamut
 * mapper -- up to a 6x collapse.
 *
 * PURE: no DOM, no clock, no randomness.
 */

export interface Character {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Relative chroma of neutral surfaces. 0 is pure grey; higher tints them toward the seed. */
  readonly neutralChroma: number;
  /** Relative chroma of text. Kept low -- tinted text loses legibility fast. */
  readonly textChroma: number;
  /** Relative chroma of the primary fill. The main lever on how loud the brand reads. */
  readonly accentChroma: number;
  /** Relative chroma of destructive / success / warning fills. */
  readonly semanticChroma: number;
  /** Multiplier on how far surfaces separate from the background. */
  readonly surfaceSeparation: number;
}

export const CHARACTERS: readonly Character[] = [
  {
    id: "calm",
    name: "Calm",
    description: "Softly tinted greys, a restrained accent. The safe default.",
    neutralChroma: 0.055,
    textChroma: 0.05,
    accentChroma: 0.58,
    semanticChroma: 0.6,
    surfaceSeparation: 1,
  },
  {
    id: "vivid",
    name: "Vivid",
    description: "Near-neutral surfaces so a fully saturated accent can shout.",
    neutralChroma: 0.03,
    textChroma: 0.03,
    accentChroma: 0.98,
    semanticChroma: 0.92,
    surfaceSeparation: 1.1,
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Paper-like, high text contrast, colour used sparingly.",
    neutralChroma: 0.018,
    textChroma: 0.02,
    accentChroma: 0.72,
    semanticChroma: 0.7,
    surfaceSeparation: 0.65,
  },
  {
    id: "soft",
    name: "Soft",
    description: "Warm, low-contrast surfaces and a gentle accent.",
    neutralChroma: 0.1,
    textChroma: 0.09,
    accentChroma: 0.46,
    semanticChroma: 0.5,
    surfaceSeparation: 0.85,
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Cool, even, unsurprising. Dense UI that gets out of the way.",
    neutralChroma: 0.025,
    textChroma: 0.03,
    accentChroma: 0.64,
    semanticChroma: 0.68,
    surfaceSeparation: 1.25,
  },
  {
    id: "brutal",
    name: "Brutal",
    description: "Pure greys, maximum separation, an unmodulated accent.",
    neutralChroma: 0,
    textChroma: 0,
    accentChroma: 1,
    semanticChroma: 1,
    surfaceSeparation: 1.6,
  },
];

export const DEFAULT_CHARACTER = "calm";

export function getCharacter(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]!;
}
