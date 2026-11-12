/**
 * Signed distance from glyph coverage (Felzenszwalb–Huttenlocher squared distance transform, sub-pixel edges from
 * the coverage itself). It lets the type glow follow the exact silhouette of every letter: an inner rim along the
 * outline and a soft light outside, at any distance, with no stepped copies of the shape.
 */
const INF = 1e20;

function edt1d(grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint32Array, z: Float64Array) {
  v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], d = q - r;
    grid[offset + q * stride] = f[r] + d * d;
  }
}

function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), v = new Uint32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

/**
 * Distance in texels from coverage 0..255 (positive outside the shape, negative inside).
 * `stride`/`offset` read one channel out of interleaved data (RGBA alpha: 4, 3).
 */
export function signedDistance(coverage: ArrayLike<number>, w: number, h: number, stride = 1, offset = 0): Float32Array {
  const outer = new Float64Array(w * h), inner = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = coverage[i * stride + offset] / 255;
    if (a >= 0.999) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0.001) { outer[i] = INF; inner[i] = 0; }
    else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
  }
  edt(outer, w, h); edt(inner, w, h);
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return out;
}

/** 8-bit encoding: 0.5 on the outline, ±range (in the same unit as `dist`) at 0 and 1. */
export function encodeDistance(dist: Float32Array, scale: number, range: number): Uint8Array {
  const out = new Uint8Array(dist.length);
  for (let i = 0; i < dist.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(255 * (0.5 + (dist[i] * scale) / (2 * range)))));
  return out;
}
