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

/** Transformation heat: peaks while a cell is between present and absent, zero at both ends. */
export const transformHeat = (s: number) => 4 * s * (1 - s);

/** Energy left by a pointer sample: gaussian in space, exponential in time, per-cell rate. */
export function sampleEnergy(strength: number, distance: number, radius: number, age: number, rate: number) {
  return strength * Math.exp(-(distance * distance) / (radius * radius)) * Math.exp(-age * rate);
}

/** Decay rate (1/s) so that a cell falls below 2% after `seconds`. */
export const rateFor = (seconds: number) => Math.log(50) / seconds;
