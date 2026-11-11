import Delaunator from 'delaunator';
import type { CellNetwork } from './chain';
import { VFX } from './config';
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

/**
 * Energy cells of a surface: a Delaunay triangulation of irregular points over the surface plus a margin.
 * Point density follows a slow noise, so neighbouring cells differ in size: random triangles, never a lattice.
 */
export function buildNetwork(width: number, height: number, spacing: number, margin: number, zone: number, seed: number): SurfaceNetwork {
  const rnd = mulberry(seed);
  const x0 = -margin, y0 = -margin, W = width + margin * 2, H = height + margin * 2;
  const pts: number[] = [];
  const edge = (len: number) => Math.max(1, Math.round(len / (spacing * 0.85)));
  const nx = edge(W), ny = edge(H);
  for (let i = 0; i <= nx; i++) { const x = x0 + (W * i) / nx; pts.push(x, y0, x, y0 + H); }
  for (let j = 1; j < ny; j++) { const y = y0 + (H * j) / ny; pts.push(x0, y, x0 + W, y); }
  const g = spacing * 0.62;
  for (let y = y0 + g * 0.5; y < y0 + H - g * 0.4; y += g) for (let x = x0 + g * 0.5; x < x0 + W - g * 0.4; x += g) {
    const keep = (0.14 + 0.86 * noise2(x / (spacing * 3.1), y / (spacing * 3.1), seed)) * 0.74;
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
    const sheen = Math.floor(rnd() * 3);
    for (let k = 0; k < 3; k++) cell.set([seeds[f], zoneArr[f], sheen, 0], (f * 3 + k) * 4);
  }
  return { faces, points, position, cell, cx, cy, seed: seeds, cond, zone: zoneArr, weight, vertexOf, nbStart: t.nbStart, nb: t.nb, pfStart: t.pfStart, pf: t.pf };
}

export interface Arch extends CellNetwork {
  /** Rendered vertices (faces*3): camera-space position (x, y, z<0). */
  position: Float32Array;
  /** Per vertex: seed, gloss, sheen edge 0..2, depth 0 (edge of the screen) .. 1 (deep centre). */
  face: Float32Array;
  /** Per vertex: ridge light of the edges opposite vertex 0, 1, 2 (same on the three vertices of a face). */
  edge: Float32Array;
  centroid: Float32Array;
  depth: Float32Array;
  zNear: number; zFar: number;
  /** Edges with one face only: the outer border of the sheet, all of it off screen. */
  open: number;
  border: number;
}

/**
 * Background: one arched sheet, its axis vertical and parallel to the screen, still.
 * Seen from the front, the two sides come close to the frame and recede toward the centre, where the sheet lies far
 * away: the cells, sampled at an even size on the sheet itself, become smaller and darker by perspective alone.
 * Light and darkness depend on the horizontal position only, so they read as vertical bands.
 * Vertices pushed along the sheet's normal make peaks and valleys; nearer ridges hide what is behind them.
 */
export function buildArch(aspect: number, viewH: number, seed = 20240611): Arch {
  const B = VFX.background, rnd = mulberry(seed);
  const T = Math.tan((B.fov * Math.PI) / 360);
  const zN = 1, zF = B.depth;
  // depth of the sheet along the screen's horizontal (u = |screen x|, 0 centre .. 1 frame), continued past the frame
  const zAt = (u: number) => (u <= 1 ? zN * Math.pow(zF / zN, Math.pow(1 - u, B.curve)) : zN * Math.max(0.55, 1 - (u - 1) * 0.9));
  // arc length along the curve, from the centre outward
  const STEPS = 2400, UMAX = 1.16;
  const us = new Float64Array(STEPS + 1), arc = new Float64Array(STEPS + 1);
  let px = 0, pz: number = zF;
  for (let i = 0; i <= STEPS; i++) {
    const u = (UMAX * i) / STEPS, z = zAt(u), x = u * z * T * aspect;
    us[i] = u;
    if (i) arc[i] = arc[i - 1] + Math.hypot(x - px, z - pz);
    px = x; pz = z;
  }
  const smax = arc[STEPS];
  const uOf = (s: number) => {
    let lo = 0, hi = STEPS;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arc[m] < s) lo = m; else hi = m; }
    const t = (s - arc[lo]) / Math.max(1e-9, arc[hi] - arc[lo]);
    return us[lo] + (us[hi] - us[lo]) * t;
  };
  // cell size on the sheet: even near the frame, opening slowly with depth so the far field stays legible
  const c0 = B.cell * (2 / viewH) * T * zN;
  const cellAt = (z: number) => c0 * Math.pow(z / zN, B.cellGrowth);
  const pts: number[] = [];
  const reach = (z: number) => z * T * 1.28;
  for (let s = -smax; s <= smax; ) {
    const u = uOf(Math.abs(s)), z = zAt(u);
    const n = 0.78 + 0.5 * noise2(s * 3.1, 0.5, seed);
    const c = cellAt(z) * n;
    const ym = reach(z), phase = rnd() * c;
    for (let y = -ym - phase; y <= ym + c; y += c * (0.82 + 0.3 * rnd())) {
      const yy = Math.max(-ym, Math.min(ym, y));
      pts.push(s + (rnd() - 0.5) * c * 0.7, yy + (Math.abs(yy) < ym ? (rnd() - 0.5) * c * 0.6 : 0));
    }
    s += c * (0.8 + 0.3 * rnd());
  }
  const d = new Delaunator(Float64Array.from(pts));
  const tri = d.triangles, faces = tri.length / 3, points = pts.length / 2;
  // lift to 3D and push along the sheet's normal: peaks and valleys
  const P = new Float32Array(points * 3);
  for (let i = 0; i < points; i++) {
    const s = pts[i * 2], y = pts[i * 2 + 1], side = Math.sign(s) || 1;
    const u = uOf(Math.abs(s)), z = zAt(u);
    const e = 0.002, z1 = zAt(Math.max(0, u - e)), z2 = zAt(u + e);
    const tx = ((u + e) * z2 - Math.max(0, u - e) * z1) * T * aspect, tz = z2 - z1;
    const l = Math.hypot(tx, tz) || 1;
    // normal of the curve, facing the camera
    let nx = -tz / l, nz = tx / l;
    const x0 = side * u * z * T * aspect;
    if (nx * -x0 * side + nz * z < 0) { nx = -nx; nz = -nz; }
    const relief = (rnd() - 0.45) * B.relief * cellAt(z);
    P[i * 3] = x0 + side * nx * relief; P[i * 3 + 1] = y + (rnd() - 0.5) * 0.2 * cellAt(z); P[i * 3 + 2] = -(z - nz * relief);
  }
  const t = tables(tri, faces, points);
  const nrm = new Float32Array(faces * 3), cen = new Float32Array(faces * 3);
  for (let f = 0; f < faces; f++) {
    const a = tri[f * 3], b = tri[f * 3 + 1], c = tri[f * 3 + 2];
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
    const vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (ax + P[b * 3] + P[c * 3]) / 3, my = (ay + P[b * 3 + 1] + P[c * 3 + 1]) / 3, mz = (az + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    const l = Math.hypot(nx, ny, nz) || 1, sgn = -(nx * mx + ny * my + nz * mz) < 0 ? -1 : 1;   // facing the camera
    nx *= sgn / l; ny *= sgn / l; nz *= sgn / l;
    nrm.set([nx, ny, nz], f * 3); cen.set([mx, my, mz], f * 3);
  }
  // ridge light per edge: convex edges catch the light, valleys stay dark
  const edgeOf = (f: number, k: number) => {
    const a = tri[f * 3 + ((k + 1) % 3)], b = tri[f * 3 + ((k + 2) % 3)];
    for (let q = t.nbStart[f]; q < t.nbStart[f + 1]; q++) {
      const g = t.nb[q];
      const gv = [tri[g * 3], tri[g * 3 + 1], tri[g * 3 + 2]];
      if (!gv.includes(a) || !gv.includes(b)) continue;
      const dx = cen[g * 3] - cen[f * 3], dy = cen[g * 3 + 1] - cen[f * 3 + 1], dz = cen[g * 3 + 2] - cen[f * 3 + 2];
      const ridge = dx * nrm[f * 3] + dy * nrm[f * 3 + 1] + dz * nrm[f * 3 + 2] < 0;
      const dot = nrm[f * 3] * nrm[g * 3] + nrm[f * 3 + 1] * nrm[g * 3 + 1] + nrm[f * 3 + 2] * nrm[g * 3 + 2];
      const sharp = Math.min(1, Math.max(0, (1 - dot) * 2.6));
      const pick = noise2(a * 0.37 + b * 0.37, 1.7, seed);
      return ridge ? (0.22 + 0.78 * sharp) * (0.3 + 0.7 * pick) : 0.05 * sharp;
    }
    return 0;
  };
  const position = new Float32Array(faces * 9), face = new Float32Array(faces * 12), edgeArr = new Float32Array(faces * 9);
  const vertexOf = new Uint32Array(faces * 3), depth = new Float32Array(faces), seeds = new Float32Array(faces);
  const cond = new Float32Array(faces), weight = new Float32Array(faces);
  const span = Math.log(zF / zN);
  for (let f = 0; f < faces; f++) {
    const e = [edgeOf(f, 0), edgeOf(f, 1), edgeOf(f, 2)];
    const sheen = e.indexOf(Math.max(...e));
    const sd = rnd(), gloss = 0.14 + 0.86 * Math.pow(rnd(), 2.4);
    const dn = Math.min(1, Math.max(0, Math.log(Math.max(zN, -cen[f * 3 + 2]) / zN) / span));
    depth[f] = dn; seeds[f] = sd;
    cond[f] = 0.25 + 0.75 * smoothstep(0.3, 0.7, noise2(cen[f * 3] * 1.3 + 7, cen[f * 3 + 1] * 1.3, seed ^ 0x2c1b));
    weight[f] = dn < 0.75 ? 1 - dn : 0;
    for (let k = 0; k < 3; k++) {
      const v = tri[f * 3 + k], o = f * 3 + k;
      vertexOf[o] = v;
      position.set([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], o * 3);
      face.set([sd, gloss, sheen, dn], o * 4);
      edgeArr.set(e, o * 3);
    }
  }
  return {
    faces, points, position, face, edge: edgeArr, centroid: cen, depth, zNear: zN, zFar: zF, open: t.open, border: d.hull.length,
    cx: new Float32Array(faces), cy: new Float32Array(faces), nbStart: t.nbStart, nb: t.nb, cond, weight, seed: seeds,
    vertexOf, pfStart: t.pfStart, pf: t.pf,
  };
}
