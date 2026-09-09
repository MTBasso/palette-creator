/**
 * The pure palette engine.
 *
 * Nothing in this directory imports React, touches the DOM, reads a clock, or
 * calls Math.random. That is what makes the colour maths testable in a `for`
 * loop and the UI replaceable without touching any of it.
 */

export * from "./oklch.ts";
export * from "./contrast.ts";
export * from "./schema.ts";
export * from "./characters.ts";
export * from "./generate.ts";
export * from "./diagnose.ts";
export * from "./export.ts";
export * from "./hash.ts";
