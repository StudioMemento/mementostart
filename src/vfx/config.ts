/**
 * Single typed configuration for the Memento VFX system.
 * Values are starting points calibrated on the boards; behaviour rules live in the modules.
 */
export interface QualityProfile {
  /** Device pixel ratio cap of the main pass. */
  dpr: number;
  bloom: boolean;
  /** Fraction of the particle pool in use. */
  particles: number;
  /** Multiplier on structural cell size (bigger cells = fewer triangles). */
  cellScale: number;
}

export const VFX = {
  color: {
    /** Surface black behind everything (sRGB 0..1). */
    base: [0.027, 0.027, 0.031] as const,
    panel: [0.012, 0.012, 0.014, 0.94] as const,
    /** Amber scale. `base` tints translucent, low-energy faces; the ramp deep > mid > hot > core drives the nuclei. */
    amber: { base: '#FF7950', deep: '#B5280A', mid: '#FF5A12', hot: '#FF9A1E', core: '#FFD46A' },
    /** Monochrome gradient of large titles, one gradient across the whole block (135deg). */
    titleGradient: [[0, '#f7f6f3'], [0.4, '#f7f6f3'], [0.68, '#d9d8d5'], [0.88, '#a8a7a4'], [1, '#868583']] as const,
  },
  scroll: {
    /** Exit and entry bands, as a fraction of the viewport height. */
    band: 0.15,
    /** Scroll speed (px/s) that saturates the scroll energy. */
    velocityRef: 1600,
    /** Energy tail after the page stops, seconds. */
    tail: 0.45,
  },
  pointer: {
    radius: 230,          // px CSS, desktop
    touchRadius: 110,     // px CSS, touch
    attack: 0.12,         // s
    release: [0.35, 0.8], // s, spread across cells
    neighbour: 0.25,      // response of surfaces in range that are not under the pointer
    sampleStep: 30,       // px of travel between deposited samples
    maxSamples: 8,
    enterImpulse: 0.55,
  },
  loading: {
    duration: 1.8,        // s, once fonts and first textures are ready
    hurry: 3.2,           // time scale when the user interacts before the end
  },
  particles: {
    pool: 160,
    life: [0.18, 0.65],   // s
    rate: 42,             // per second at full pointer speed
    speedRef: 900,        // px/s of pointer travel that saturates emission
    size: [1.6, 4.6],     // px
    curl: 130,            // curl-noise strength, px/s^2
  },
  cells: {
    card: 36,             // px, structural cells of cards and panels
    titleFactor: 0.2,     // structural cell = font size * factor
    titleRange: [14, 46],
    microCard: 17,        // px, energy micro-lattice on images and panels
    microTitleFactor: 0.062,
    microTitleRange: [5.5, 13],
  },
  bloom: { scale: 0.25, strength: 0.9 },
  quality: {
    high: { dpr: 2, bloom: true, particles: 1, cellScale: 1 },
    medium: { dpr: 1.5, bloom: true, particles: 0.6, cellScale: 1.25 },
    low: { dpr: 1, bloom: false, particles: 0.35, cellScale: 1.6 },
  } satisfies Record<string, QualityProfile>,
  /** Frames longer than this (ms) count as slow for the adaptive quality step. */
  slowFrame: 30,
} as const;

export type QualityName = keyof typeof VFX.quality;

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
