import Delaunator from 'delaunator';
import type { CellNetwork } from './chain';
import { smoothstep } from './structure';

/**
 * Geometry: stable triangulations. Seeds, cell ids and rest positions never change between frames;
 * a surface is only re-triangulated when its size changes.
 */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/** Smooth value noise on an integer lattice hashed with `seed`. */
export function noise2(x: number, y: number, seed: number) {
  const lat = (i: number, j: number) => {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2246822519)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Adjacency and smoothing tables from an indexed triangle list. */
function tables(tri: ArrayLike<number>, faces: number, points: number) {
  const edges = new Map<number, number>();
  const nbs: number[][] = Array.from({ length: faces }, () => []);
  for (let f = 0; f < faces; f++) for (let k = 0; k < 3; k++) {
    const a = tri[f * 3 + k], b = tri[f * 3 + ((k + 1) % 3)];
    const key = Math.min(a, b) * 1048576 + Math.max(a, b);
    const other = edges.get(key);
    if (other === undefined) edges.set(key, f);
    else { nbs[f].push(other); nbs[other].push(f); edges.delete(key); }
  }
  const nbStart = new Uint32Array(faces + 1);
  for (let f = 0; f < faces; f++) nbStart[f + 1] = nbStart[f] + nbs[f].length;
  const nb = new Uint32Array(nbStart[faces]);
  nbs.forEach((list, f) => nb.set(list, nbStart[f]));
  const count = new Uint32Array(points + 1);
  for (let i = 0; i < faces * 3; i++) count[tri[i] + 1]++;
  for (let p = 0; p < points; p++) count[p + 1] += count[p];
  const pf = new Uint32Array(faces * 3), fill = count.slice(0, points);
  for (let i = 0; i < faces * 3; i++) pf[fill[tri[i]]++] = Math.floor(i / 3);
  return { nbStart, nb, pfStart: count, pf, open: edges.size };
}

export interface SurfaceNetwork extends CellNetwork {
  /** Rendered vertices (faces*3): local px. */
  position: Float32Array;
  /** Per rendered vertex: seed, zone conductivity, sheen edge 0..2, 0. */
  cell: Float32Array;
  /** Zone conductivity before content weighting. */
  zone: Float32Array;
}

/** Optional edge bias: cells shrink toward the surface's outline, so the topology gathers along its edges. */
export interface EdgeBias {
  /** Cell spacing at the outline (px); `spacing` applies in the middle. */
  spacing: number;
  /** Distance from the outline (px) over which cells grow back to `spacing`. */
  reach: number;
}

/**
 * Energy cells of a surface: a Delaunay triangulation of irregular points over the surface plus a margin.
 * Point density follows a slow noise, so neighbouring cells differ in size: random triangles, never a lattice.
 * With an edge bias, density also rises toward the outline: small cells along the edges, large ones in the middle.
 * Per rendered vertex, `cell` carries seed, zone, sheen edge and nearness to the outline (1 on it, 0 past `reach`).
 */
export function buildNetwork(width: number, height: number, spacing: number, margin: number, zone: number, seed: number, edge?: EdgeBias): SurfaceNetwork {
  const rnd = mulberry(seed);
  const x0 = -margin, y0 = -margin, W = width + margin * 2, H = height + margin * 2;
  const pts: number[] = [];
  const fine = edge ? Math.min(spacing, edge.spacing) : spacing;
  const edgeLen = (len: number) => Math.max(1, Math.round(len / (fine * (edge ? 1.6 : 0.85))));
  const nx = edgeLen(W), ny = edgeLen(H);
  for (let i = 0; i <= nx; i++) { const x = x0 + (W * i) / nx; pts.push(x, y0, x, y0 + H); }
  for (let j = 1; j < ny; j++) { const y = y0 + (H * j) / ny; pts.push(x0, y, x0 + W, y); }
  /** 1 on the outline, 0 at `reach` and beyond (inside or out). */
  const near = (x: number, y: number) => {
    if (!edge) return 0;
    const d = Math.min(Math.abs(x), Math.abs(y), Math.abs(width - x), Math.abs(height - y));
    return 1 - smoothstep(0, edge.reach, d);
  };
  const g = fine * 0.62;
  for (let y = y0 + g * 0.5; y < y0 + H - g * 0.4; y += g) for (let x = x0 + g * 0.5; x < x0 + W - g * 0.4; x += g) {
    const n = noise2(x / (spacing * 3.1), y / (spacing * 3.1), seed);
    // sizes vary between neighbours, within a narrow band: the scale of a layer stays readable (a hierarchy, not noise)
    let keep = (0.4 + 0.6 * n) * 0.74;
    if (edge) {
      // local spacing between the outline's and the middle's, with noise: mixed sizes everywhere, fine at the edges
      const k = near(x, y);
      const local = edge.spacing + (spacing - edge.spacing) * (1 - k) * (0.75 + 0.5 * noise2(x / 90 + 3.3, y / 90 - 1.7, seed ^ 0x9e37));
      keep = Math.min(1, (g / local) ** 2 * (0.6 + 0.6 * n));
    }
    if (rnd() < keep) pts.push(x + (rnd() - 0.5) * g * 0.9, y + (rnd() - 0.5) * g * 0.9);
  }
  const d = new Delaunator(Float64Array.from(pts));
  const tri = d.triangles, faces = tri.length / 3, points = pts.length / 2;
  const t = tables(tri, faces, points);
  const position = new Float32Array(faces * 6), cell = new Float32Array(faces * 12), vertexOf = new Uint32Array(faces * 3);
  const cx = new Float32Array(faces), cy = new Float32Array(faces), seeds = new Float32Array(faces);
  const cond = new Float32Array(faces), zoneArr = new Float32Array(faces), weight = new Float32Array(faces);
  for (let f = 0; f < faces; f++) {
    let sx = 0, sy = 0;
    for (let k = 0; k < 3; k++) {
      const p = tri[f * 3 + k];
      position[(f * 3 + k) * 2] = pts[p * 2]; position[(f * 3 + k) * 2 + 1] = pts[p * 2 + 1];
      vertexOf[f * 3 + k] = p; sx += pts[p * 2]; sy += pts[p * 2 + 1];
    }
    cx[f] = sx / 3; cy[f] = sy / 3; seeds[f] = rnd();
    // zones: where the reaction travels and where it dies out
    zoneArr[f] = smoothstep(0.3, 0.7, noise2(cx[f] / zone + 11.3, cy[f] / zone - 4.1, seed ^ 0x5bd1));
    cond[f] = zoneArr[f];
    const inside = cx[f] >= 0 && cy[f] >= 0 && cx[f] <= width && cy[f] <= height;
    weight[f] = inside ? 1 : 0;
    const sheen = Math.floor(rnd() * 3), nearness = near(cx[f], cy[f]);
    for (let k = 0; k < 3; k++) cell.set([seeds[f], zoneArr[f], sheen, nearness], (f * 3 + k) * 4);
  }
  return { faces, points, position, cell, cx, cy, seed: seeds, cond, zone: zoneArr, weight, vertexOf, nbStart: t.nbStart, nb: t.nb, pfStart: t.pfStart, pf: t.pf };
}
