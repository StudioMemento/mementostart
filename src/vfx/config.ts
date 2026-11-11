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

export interface ChainProfile {
  /** Generations a chain reaction may travel before it stops. */
  maxGen: number;
  /** Probability that a lit cell lights a neighbour in a fully conductive zone. */
  spread: number;
  /** Share of energy carried to the next cell. */
  carry: number;
  /** Release of a cell (s), when it differs from the shared one. */
  release?: readonly [number, number];
  /** Rest after lighting (s), when it differs from the shared one. */
  refractory?: readonly [number, number];
  /** Multiplier on pointer ignitions. */
  rate?: number;
}

export const VFX = {
  color: {
    /** Surface black behind everything (sRGB 0..1). */
    base: [0.018, 0.018, 0.021] as const,
    panel: [0.012, 0.012, 0.014, 0.94] as const,
    /** Amber scale: deep > mid > hot > core. `base` is the configurable reference tint. */
    amber: { base: '#FF7950', deep: '#A8260A', mid: '#FF5A12', hot: '#FF9A1E', core: '#FFD878' },
    /**
     * Idle gradient of large type: light from above, shade at the base of every line.
     * Light to dark from the cap line to the baseline; the energy turns it amber in the same direction.
     */
    titleGradient: [[0, '#f8f7f4'], [0.3, '#f4f3f0'], [0.64, '#c3c2bf'], [1, '#77767a']] as const,
  },
  background: {
    fov: 52,              // deg, vertical
    around: 30,           // faces around the tunnel
    near: 1.9,            // first ring, as a multiple of the screen half-height (off screen)
    far: 0.035,           // last ring, same unit (a point in the dark centre)
    ratio: [1.85, 1.22],   // ring-to-ring depth ratio, near > far: long shards at the frame, dense small ones inward
    twist: [0.22, 0.07],  // rad per ring, near > far: the oblique directrices
    relief: 0.44,         // radial amplitude of peaks and valleys
    split: 0.42,          // share of quads raised into a four-face pyramid
    roll: 0.00011,        // rad per px of scroll
    dolly: 0.28,          // forward travel across the whole page, in units of the first ring depth
    parallax: 0.012,      // rad toward the pointer
    fog: 3.0,             // darkness with depth
    /** Point lights inside the tunnel, camera space (x, y, z, intensity): one deep and grazing, two near the frame. */
    lights: [[0, 0.35, -9, 2.2], [-1.3, 1.0, -2.2, 1.6], [1.4, -0.9, -3, 1.2]] as [number, number, number, number][],
    /** Body, diffuse, specular, ridge-line strengths. */
    shade: [0.012, 0.045, 1.2, 4.2] as [number, number, number, number],
  },
  chain: {
    /** Cards: few, irregular, large cells. */
    card: { spacing: 64, margin: 30, zone: 200, maxGen: 7, spread: 0.86, carry: 0.86 },
    /** Large type: finer cells (em), zones about the size of a letter. */
    title: { spacingEm: 0.2, marginEm: 0.07, zoneEm: 1.1, maxGen: 10, spread: 0.86, carry: 0.9, microEm: 0.07, release: [0.7, 1.4] as const, refractory: [0.3, 0.6] as const, rate: 1.7 },
    background: { maxGen: 6, spread: 0.82, carry: 0.86, release: [0.6, 1.3] as const },
    delay: [0.05, 0.15] as [number, number],       // s, from a lit cell to its neighbour
    refractory: [0.5, 1.0] as [number, number],    // s before a cell can light again
    release: [0.35, 0.8] as [number, number],      // s, energy of a cell falls below 2%
    attack: 0.07,                                   // s, rise of a cell
  },
  pointer: {
    radius: 230,          // px CSS, desktop
    touchRadius: 110,     // px CSS, touch
    attack: 0.12,         // s, hover state of a surface
    neighbour: 0.25,      // strength of surfaces in range that are not under the pointer
    hoverRate: 8,         // ignitions per second under the pointer
    stillRate: 4.5,       // after ~0.6 s without movement: the field keeps shifting slowly
    moveRate: 1 / 85,     // extra ignitions per px of travel
    jitter: 0.32,         // spread of ignitions around the pointer, × radius
    enterBurst: 5,
    proximityRate: 3,     // per second at the edge of the range
  },
  border: { bins: 96, decay: 3.2, reach: 46 },
  scroll: {
    /** Exit and entry bands, as a fraction of the viewport height. */
    band: 0.15,
  },
  loading: {
    duration: 1.8,        // s, once fonts and first textures are ready
    hurry: 3.2,           // time scale when the user interacts before the end
    ignite: 0.14,         // share of cells that light up as they join
  },
  particles: {
    pool: 180,
    curl: 110,            // curl-noise strength, px/s^2
    perSecond: 16,        // per surface
    spark: { size: [1.6, 4.4], life: [0.3, 0.65], speed: [40, 110] } as const,
    shard: { size: [3, 12], life: [0.9, 1.5], speed: [45, 125] } as const,
  },
  /** Structural cells (loading and scroll tessellation). */
  cells: { card: 36 },
  bloom: { scale: 0.25, strength: 0.95 },
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

/** Luminance (mean of rgb, 0..1) of the gradient's base and top: the overlay reads height within a line from it. */
export const gradientRange = (): [number, number] => {
  const lum = (hex: string) => hexToRgb(hex).reduce((a, b) => a + b, 0) / 3;
  const g = VFX.color.titleGradient;
  return [lum(g[g.length - 1][1]), lum(g[0][1])];
};
