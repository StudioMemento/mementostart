/**
 * Structural composition: which cells are present. Pure functions of position and loading progress.
 * The vertex shader in shaders.ts evaluates the same formulas; these are the reference and what the tests exercise.
 * Nothing here depends on time, velocity or energy: stopping the page freezes the structure, reversing it replays it.
 */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const fract = (x: number) => x - Math.floor(x);

/** How strongly each band acts: 0 at the very start / end of the document, so first and last content can be read whole. */
export function bandEnable(scrollY: number, maxScroll: number, bandPx: number) {
  const end = clamp01((maxScroll - scrollY) / bandPx);
  // at the very end nothing can scroll further: the closing call to action is released from the exit band too
  return { top: clamp01(scrollY / bandPx) * end, bottom: end };
}

/** Fragmentation 0..1 at a viewport y: 0 across the reading band, rising toward the top and bottom edges. */
export function fragmentation(y: number, viewH: number, bandPx: number, top = 1, bottom = 1) {
  const eT = clamp01(1 - y / bandPx) * top;
  const eB = clamp01(1 - (viewH - y) / bandPx) * bottom;
  return Math.pow(Math.max(eT, eB), 1.25);
}

/** Absence 0..1 of one cell (seed 0..1 is its stable local threshold) for a given fragmentation. */
export function cellAbsence(F: number, seed: number) {
  const th = 0.14 + 0.7 * seed;
  return smoothstep(th - 0.13, th + 0.13, F);
}

/** Absence 0..1 of a cell during loading; delay 0..1 is its correlated place in the sequence. */
export function loadingAbsence(load: number, delay: number) {
  return 1 - smoothstep(delay - 0.09, delay + 0.09, load * 1.3 - 0.15);
}

/** Same hash and value noise as the GLSL `h21` / `vnoise`, so CPU timing agrees with what the GPU shows. */
export function h21(x: number, y: number) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
export function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Loading delay 0..1 of a point in document px (seed 0..1 is the cell's own share). */
export function loadingDelay(x: number, y: number, seed: number) {
  const n = vnoise(x / 250 + 3.7, y / 250 + 3.7);
  return clamp01((seed + (n - seed) * 0.64) * 1.16 - 0.08);
}

/** Decay rate (1/s) so that a cell falls below 2% after `seconds`. */
export const rateFor = (seconds: number) => Math.log(50) / seconds;
