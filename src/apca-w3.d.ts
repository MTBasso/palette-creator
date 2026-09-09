/**
 * `apca-w3` ships no types. Declared here rather than vendored, because the
 * licence requires the implementation be used pinned and unmodified -- this
 * describes its surface without touching its constants.
 */
declare module "apca-w3" {
  /** Screen luminance from an sRGB 0-255 triple. */
  export function sRGBtoY(rgb: [number, number, number] | number[]): number;

  /**
   * Signed lightness contrast. Positive: dark text on light background.
   * Negative: light text on dark background.
   */
  export function APCAcontrast(txtY: number, bgY: number): number | string;

  export function reverseAPCA(
    contrast?: number,
    knownY?: number,
    knownType?: "bg" | "txt",
    returnAs?: "hex" | "color" | "Y" | "array",
  ): number | string | number[] | false;

  export function fontLookupAPCA(contrast: number, places?: number): number[];
}
