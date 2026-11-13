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

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Same luminance, no hue. */
export const desaturate = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  const v = Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 255).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
};

/**
 * One gradient over the whole title block (0 = cap line of the first line, 1 = baseline of the last). Light comes from
 * above: the first line stays white, the shade only lives in the lower part of the last line.
 */
const TITLE_AMBER = [[0, '#fbefe8'], [0.56, '#fbefe8'], [0.68, '#f5d9c6'], [0.8, '#ecb28c'], [0.91, '#e2874f'], [1, '#d9682f']] as const;

export const VFX = {
  color: {
    /** Surface black behind everything (sRGB 0..1). */
    base: [0.008, 0.008, 0.009] as const,
    /** Cards and panels: void black, opaque. Nothing of the sheet shows through, so no edge of an image can either. */
    panel: [0.006, 0.006, 0.007, 1] as const,
    /** Amber scale: deep > mid > hot > core. `base` is the configurable reference tint. */
    amber: { base: '#FF7950', deep: '#9E2208', mid: '#FF5510', hot: '#FF8A1C', core: '#FFCB72' },
    /**
     * Large type, one gradient over the whole block (first cap line to last baseline): warm white above, orange at
     * the base. It is the hover state; at rest the block shows the same gradient desaturated (`titleGradient`).
     */
    titleAmber: TITLE_AMBER,
    /** Where the range reaches: warm yellow above, deeper toward the base; orange comes from the facets inside. */
    titleHot: ['#ffe6c4', '#ffda8c', '#ffb45c'] as const,
    /** Idle gradient of large type: the amber gradient desaturated (same luminance, no hue). */
    titleGradient: TITLE_AMBER.map(([t, c]) => [t, desaturate(c)] as const),
    /** Type and icons on cards: one colour, no gradient. */
    cardInk: '#f2f0ec',
  },
  background: {
    fov: 52,              // deg, vertical
    depth: 20,            // depth of the sheet at the centre, × its depth at the frame
    curve: 1.5,           // recession profile: the walls face the viewer at the frame, then turn away into depth
    cell: 0.26,           // cell where the sheet meets the frame (the foreground), × viewport height
    cellPx: [96, 470] as [number, number],
    cellMin: 24,          // px: smallest cell on screen, deep in the centre
    cellGrowth: 0.3,      // cells open with depth: on screen they shrink ~depth^0.7, a measured range from the frame to the centre
    /** Foreground cells are drawn out along the vertical: tall shards at the frame, even cells in depth. */
    stretch: 1.55,
    /** Size variation between neighbouring cells (0 = even): small, so size reads as distance, as on a wireframe. */
    irregular: 0.18,
    relief: 0.95,         // height of the obsidian blocks, × local cell size, along the sheet's normal
    /** Blocks: spacing of their centres (cells), crest profile (<1 rounder, 1 pyramid), how far each one leans. */
    rock: [2.3, 0.8, 0.45] as [number, number, number],
    /**
     * Obsidian: the faces are black glass that reflects a still studio. Overhead softbox (light from above, like the
     * type), the far light at the end of the tunnel (the centre), Fresnel F0, surface flecks (graphite grain).
     */
    env: [5, 2.5, 0.06, 0.4] as [number, number, number, number],
    /** A soft light from above (camera-space direction, strength): crests lit, undersides dark, like the type. */
    key: [0, 0.8, 0.55, 0.1] as [number, number, number, number],
    fog: 0.55,            // darkness with depth, on top of the light's own falloff
    falloff: 0.05,        // light intensity / (1 + falloff·d²): near is bright, deep is dark
    /** Point lights, camera space (x, y, z, intensity): one close to the viewer lifts the foreground, two inside rake along the walls. */
    lights: [[0, 0.5, -0.5, 0.85], [0, -0.2, -3, 2.1], [0, 0, -10, 1.8]] as [number, number, number, number][],
    /** Body, diffuse, specular, ridge-line strengths: a dark graphite body, light only where it rakes. */
    shade: [0.003, 0.008, 1.6, 1.4] as [number, number, number, number],
    /** Broad sheen: strength, exponent, share on the ridge lines; faint level of every edge. */
    gloss: [0.02, 10, 0.05, 0.012] as [number, number, number, number],
    /** Foreground highlights: strength, depth they reach (0..1), selectivity (higher = only the sharpest ridges). */
    rim: [0.8, 0.32, 3] as [number, number, number],
    /** Brightness at the edge of the layout column (the darkest point, × the frame); level of the far cells behind it. */
    levels: [0.035, 0.07] as [number, number],
    /** Depth of field behind the column: share of the column half-width over which focus is lost. */
    focus: 0.55,
    /** Blur widths (half-size texels): a little out of focus, then softly (a light depth of field: scale and darkness do the rest). */
    blur: { med: [1] as readonly number[], big: [1.5, 2] as readonly number[] },
    /** Pointer ignitions on the sheet behind the column, × those in the side padding. */
    columnRate: 0.5,
  },
  chain: {
    /** Cards: irregular cells of mixed sizes, fine along the outline and large in the middle; a slow, controlled reaction. */
    card: { spacing: 62, edgeSpacing: 15, edgeReach: 120, topoArea: 230000, margin: 30, zone: 170, maxGen: 6, spread: 0.74, carry: 0.86, rate: 0.5,
      /** Reach of the pointer over the cells (px): under it, from outside (a neighbour in range); share lit across the card
       *  (0: no still field of triangles, cells show where the reaction passes and near the pointer); strength from outside. */
      wake: [150, 150, 0, 1.2] as [number, number, number, number],
      /** Type near the pointer: warmth, reach (px), share when the card is only in range. */
      inkWarm: [0.75, 280, 0.45] as [number, number, number],
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
  /** Structural cells (loading and scroll tessellation): smaller and of mixed sizes. */
  cells: { card: 21, titleEm: 0.075 },
  bloom: { scale: 0.5, strength: 0.95 },
  /**
   * The final grade, one pass over the whole frame: highlights roll off above `shoulder` instead of clipping (the type
   * below it keeps its exact colour), a horizontal streak drawn from the bloom (anamorphic, warm, only where there is
   * energy), vignette at the corners, fine film grain (none on pure black, 24 steps a second), chromatic aberration
   * toward the frame (px at the corners), dithering against banding in the blacks.
   */
  post: { shoulder: 0.84, streak: 0.2, vignette: 0.26, grain: 0.016, aberration: 1.4 },
  quality: {
    high: { dpr: 2, bloom: true, particles: 1, cellScale: 1 },
    medium: { dpr: 1.5, bloom: true, particles: 0.6, cellScale: 1.25 },
    low: { dpr: 1, bloom: false, particles: 0.35, cellScale: 1.6 },
  } satisfies Record<string, QualityProfile>,
  /** Frames longer than this (ms) count as slow for the adaptive quality step. */
  slowFrame: 30,
} as const;

export type QualityName = keyof typeof VFX.quality;



/** Amber gradient for the title shader: per stop, colour and the luminance of its idle (desaturated) version. */
export const titleRamp = () => VFX.color.titleAmber.flatMap(([, c]) => {
  const [r, g, b] = hexToRgb(c);
  return [r, g, b, Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 255) / 255];
});

/** Luminance (mean of rgb, 0..1) of the gradient's base and top: the overlay reads height within a line from it. */
export const gradientRange = (): [number, number] => {
  const lum = (hex: string) => hexToRgb(hex).reduce((a, b) => a + b, 0) / 3;
  const g = VFX.color.titleGradient;
  return [lum(g[g.length - 1][1]), lum(g[0][1])];
};
