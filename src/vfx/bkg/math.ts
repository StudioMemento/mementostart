/**
 * Background (BKG): pure functions, shared by the renderer and the tests.
 * Coordinates: "tan" space is the camera's image plane (x right, y up), in units of tan(angle) from the optical axis.
 */

export type BkgQuality = 'high' | 'medium' | 'low';
export type PlateSetName = 'landscape' | 'landscape_m' | 'portrait';

/** Number of taps of a hexagonal gather with `rings` rings around the centre. */
export const tapCount = (rings: number) => 1 + 3 * rings * (rings + 1);

/**
 * Hexagonal lattice offsets, ring by ring (unit spacing), rotated 15° like a six-blade aperture.
 * Each entry is (x, y, ring); padded to the shader's fixed array of 127 taps (6 rings).
 */
export function hexTaps(rings: number): Float32Array {
  const out = new Float32Array(127 * 3);
  const dirs = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 12;
    return [Math.cos(a), Math.sin(a)];
  });
  let n = 1;
  for (let k = 1; k <= rings; k++) {
    for (let side = 0; side < 6; side++) {
      const a = dirs[side], b = dirs[(side + 2) % 6];
      for (let j = 0; j < k; j++) out.set([a[0] * k + b[0] * j, a[1] * k + b[1] * j, k], 3 * n++);
    }
  }
  return out;
}

/**
 * Soft tap count of a sample whose circle of confusion spans `x` tap spacings: the normalisation of the scatter-as-gather
 * weights. Mirrors `nsoft` in the gather shader; a uniform region sums to exactly 1.
 */
export function nsoft(x: number, rings: number) {
  let n = 1;
  for (let m = 1; m <= rings; m++) n += 6 * m * Math.min(1, Math.max(0, x - m + 0.5));
  return n;
}

/** Weight of ring `k` for a sample whose CoC spans `x` spacings (ring 0 is always the sample itself). */
export const ringCover = (k: number, x: number) => (k === 0 ? 1 : Math.min(1, Math.max(0, x - k + 0.5)));

/**
 * Visible half extents (tan) of a viewport. The long side shows `longHalf`, so the scale ramp reaches the edge of the
 * world along it on every screen; the short side shows a share of it (on a phone, the start of the ramp). On near-square
 * windows the short side would leave the plate: the framing tightens just enough to keep it under `shortCap` (the minimum).
 */
export function viewHalf(w: number, h: number, longHalf: number, shortCap = 0.4): [number, number] {
  const [hx, hy] = w >= h ? [longHalf, (longHalf * h) / w] : [(longHalf * w) / h, longHalf];
  const k = Math.min(1, shortCap / Math.min(hx, hy));
  return [hx * k, hy * k];
}

/** The plate set for a viewport and quality. Only an orientation change swaps it: resizes never re-render content. */
export function plateSetFor(w: number, h: number, quality: BkgQuality): PlateSetName {
  if (w < h) return 'portrait';
  return quality === 'high' ? 'landscape' : 'landscape_m';
}

/** One step of a damped spring (a focus puller's hand: slow, with a slight overshoot). Returns [value, velocity]. */
export function springStep(x: number, v: number, target: number, dt: number, period: number, damping: number): [number, number] {
  const om = (2 * Math.PI) / period;
  const a = om * om * (target - x) - 2 * damping * om * v;
  const nv = v + a * dt;
  return [x + nv * dt, nv];
}

/** Touch: the scroll racks the focus through the planes, midground → foreground → background → midground. */
export function scrollFocus(progress: number, planes: { bg: number; mg: number; fg: number }) {
  const keys = [planes.mg, planes.fg - 0.05, planes.bg + 0.02, planes.mg];
  const x = Math.min(0.999, Math.max(0, progress)) * (keys.length - 1);
  const i = Math.floor(x), f = x - i, e = f * f * (3 - 2 * f);
  return keys[i] + (keys[i + 1] - keys[i]) * e;
}

/** Plate encoding: y = sqrt(x / (x + c)), so blacks keep precision and highlights roll off. */
export const decode = (y: number, c: number) => {
  const q = Math.min(y, 0.9985) ** 2;
  return (c * q) / (1 - q);
};
export const encode = (x: number, c: number) => Math.sqrt(Math.max(0, x) / (Math.max(0, x) + c));
