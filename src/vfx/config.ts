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
  /** Per-profile timing (s); the shared values apply when omitted. */
  delay?: readonly [number, number];
  release?: readonly [number, number];
  refractory?: readonly [number, number];
  attack?: number;
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
    depth: 20,            // depth of the sheet at the centre, × its depth at the frame
    curve: 1.5,           // recession profile: the walls face the viewer at the frame, then turn away into depth
    cell: 0.21,           // cell where the sheet meets the frame (the foreground), × viewport height
    cellPx: [72, 320] as [number, number],
    cellMin: 9,           // px: smallest cell on screen, deep in the centre
    cellGrowth: 0.1,      // cells open slightly with depth (on screen they still shrink ~depth^0.9)
    relief: 0.9,          // peaks and valleys, × local cell size, along the sheet's normal
    fog: 0.45,            // darkness with depth, on top of the light's own falloff
    falloff: 0.05,        // light intensity / (1 + falloff·d²): near is bright, deep is dark
    /** Point lights, camera space (x, y, z, intensity): one close to the viewer lifts the foreground, two inside rake along the walls. */
    lights: [[0, 0.5, -0.5, 0.85], [0, -0.2, -3, 2.1], [0, 0, -10, 1.8]] as [number, number, number, number][],
    /** Body, diffuse, specular, ridge-line strengths. */
    shade: [0.018, 0.07, 1.25, 3.4] as [number, number, number, number],
    /** Broad sheen: strength, exponent, share on the ridge lines. */
    gloss: [0.1, 8, 0.12] as [number, number, number],
    /** Brightness behind the layout column relative to the frame: the gradient runs across the side padding. */
    centre: 0.16,
  },
  chain: {
    /** Cards: irregular cells of mixed sizes, fine along the outline and large in the middle; a slow, controlled reaction. */
    card: { spacing: 62, edgeSpacing: 15, edgeReach: 120, topoArea: 230000, margin: 30, zone: 170, maxGen: 6, spread: 0.74, carry: 0.86, rate: 0.5,
      delay: [0.12, 0.28] as const, release: [0.9, 1.7] as const, refractory: [0.9, 1.5] as const, attack: 0.2 },
    /** Large type: medium cells carry the reaction, a finer lattice of mixed sizes lights inside the glyphs. */
    title: { spacingEm: 0.2, marginEm: 0.16, zoneEm: 1.1, maxGen: 9, spread: 0.82, carry: 0.9, microEm: 0.095, rate: 0.9,
      delay: [0.14, 0.32] as const, release: [1.2, 2.2] as const, refractory: [0.8, 1.3] as const, attack: 0.24 },
    background: { maxGen: 7, spread: 0.8, carry: 0.86,
      delay: [0.1, 0.24] as const, release: [1.0, 1.9] as const, refractory: [1.2, 2] as const, attack: 0.16 },
    delay: [0.05, 0.15] as [number, number],       // s, from a lit cell to its neighbour
    refractory: [0.5, 1.0] as [number, number],    // s before a cell can light again
    release: [0.35, 0.8] as [number, number],      // s, energy of a cell falls below 2%
    attack: 0.07,                                   // s, rise of a cell
  },
  /** Type: the hover range along the phrase (x: × pointer radius, × font size; y: the same) and its easing (s). */
  type: { range: [1.6, 2.4, 0.65, 0.75] as [number, number, number, number], rise: 0.45, fall: 1.1 },
  pointer: {
    radius: 230,          // px CSS, desktop
    touchRadius: 110,     // px CSS, touch
    attack: 0.12,         // s, hover state of a surface
    neighbour: 0.25,      // strength of surfaces in range that are not under the pointer
    hoverRate: 7,         // ignitions per second under the pointer
    stillRate: 2.4,       // after ~0.6 s without movement: the field keeps shifting slowly
    moveRate: 1 / 85,     // extra ignitions per px of travel
    jitter: 0.32,         // spread of ignitions around the pointer, × radius
    enterBurst: 5,
    proximityRate: 3, sourceEvery: 1.6,     // per second at the edge of the range
  },
  border: { bins: 96, decay: 3.2, reach: 46 },
  scroll: {
    /** Exit and entry bands, as a fraction of the viewport height. */
    band: 0.15,
    /** Once the page stops, cells on their way out drift off along a curl field (px/s) and fade within `fade` s. */
    drift: 42, fade: 1.6,
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
  /** Structural cells (loading and scroll tessellation): smaller and of mixed sizes. */
  cells: { card: 21, titleEm: 0.075 },
  bloom: { scale: 0.5, strength: 1.1 },
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
