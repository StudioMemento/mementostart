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

export interface CellMesh { position: Float32Array; centroid: Float32Array; seed: Float32Array; triangles: number }

/**
 * Structural cells of a surface: a jittered grid, each quad split along a seeded diagonal.
 * Positions are local px (origin = surface top-left), so moving a surface costs nothing.
 */
export function buildCells(width: number, height: number, cell: number, seed: number): CellMesh {
  const nx = Math.max(1, Math.round(width / cell)), ny = Math.max(1, Math.round(height / (cell * 0.92)));
  const rnd = mulberry(seed);
  const px = new Float32Array((nx + 1) * (ny + 1)), py = new Float32Array((nx + 1) * (ny + 1));
  const sx = width / nx, sy = height / ny;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i;
    // border points stay on the border so the silhouette is exact
    px[k] = i * sx + (i > 0 && i < nx ? (rnd() - 0.5) * sx * 0.74 : 0);
    py[k] = j * sy + (j > 0 && j < ny ? (rnd() - 0.5) * sy * 0.74 : 0);
  }
  const triangles = nx * ny * 2;
  const position = new Float32Array(triangles * 6), centroid = new Float32Array(triangles * 6), seeds = new Float32Array(triangles * 3);
  let t = 0;
  const push = (a: number, b: number, c: number) => {
    const cx = (px[a] + px[b] + px[c]) / 3, cy = (py[a] + py[b] + py[c]) / 3, s = rnd();
    for (const v of [a, b, c]) {
      position[t * 2] = px[v]; position[t * 2 + 1] = py[v];
      centroid[t * 2] = cx; centroid[t * 2 + 1] = cy; seeds[t] = s; t++;
    }
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    if (rnd() < 0.5) { push(a, b, c); push(b, d, c); } else { push(a, b, d); push(a, d, c); }
  }
  return { position, centroid, seed: seeds, triangles };
}

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

export interface Tunnel extends CellNetwork {
  /** Rendered vertices (faces*3): position in camera space before roll (x, y, z<0). */
  position: Float32Array;
  /** Per vertex: seed, gloss, sheen edge 0..2, depth 0 (near) .. 1 (far). */
  face: Float32Array;
  /** Per vertex: ridge light of the edges opposite vertex 0, 1, 2 (same on the three vertices of a face). */
  edge: Float32Array;
  /** Per vertex: radial direction and phase of the slow wave. */
  wave: Float32Array;
  /** Face centroids in 3D, for projecting the network onto the screen. */
  centroid: Float32Array;
  depth: Float32Array;
  z0: number; z1: number;
  /** Edges with one face only: zero for a closed surface. */
  open: number;
}

/**
 * Background: one continuous faceted surface around the camera, seen in perspective.
 * A crumpled tunnel of rings: long oblique shards where it meets the frame, smaller and denser cells toward the
 * vanishing point, darker with depth. Peaks and valleys are vertices pushed in and out; nearer ridges hide what
 * lies behind them, so edges that do not meet read as covered. The far end is closed by a fan: no holes, no seams.
 */
export function buildTunnel(aspect: number, seed = 20240611): Tunnel {
  const B = VFX.background, rnd = mulberry(seed);
  const T = Math.tan((B.fov * Math.PI) / 360);
  const z0 = 1 / (B.near * T), z1 = 1 / (B.far * T), span = Math.log(z1 / z0);
  const rings: number[] = [];
  for (let z = z0; z < z1; ) {
    rings.push(z);
    const t = smoothstep(0, 1, Math.log(z / z0) / span);
    z *= B.ratio[0] + (B.ratio[1] - B.ratio[0]) * t;
  }
  rings.push(z1);
  const N = B.around, R = rings.length, p = 2.4;
  const P: number[] = [], wave: number[] = [];
  let twist = 0;
  const put = (theta: number, z: number, d: number) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    const ux = Math.sign(c) * Math.pow(Math.abs(c), 2 / p), uy = Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    P.push(aspect * ux * (1 + d), uy * (1 + d), -z);
    const l = Math.hypot(ux, uy) || 1;
    wave.push(ux / l, uy / l, rnd());
    return P.length / 3 - 1;
  };
  for (let j = 0; j < R; j++) {
    const t = Math.log(rings[j] / z0) / span;
    if (j > 0) twist += B.twist[0] + (B.twist[1] - B.twist[0]) * t;
    for (let i = 0; i < N; i++) {
      const theta = ((i + (rnd() - 0.5) * 0.62) / N) * Math.PI * 2 + twist;
      const z = rings[j] * (j > 0 && j < R - 1 ? 1 + (rnd() - 0.5) * 0.2 : 1);
      put(theta, z, (rnd() - 0.42) * B.relief * (j === 0 ? 0.6 : 1));
    }
  }
  const tri: number[] = [];
  const at = (i: number, j: number) => j * N + (((i % N) + N) % N);
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < N; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    if (rnd() < B.split) {
      // a four-face pyramid: its apex rises toward the axis or sinks into a valley
      let mx = 0, my = 0, mz = 0;
      for (const v of [a, b, c, d]) { mx += P[v * 3] / 4; my += P[v * 3 + 1] / 4; mz += P[v * 3 + 2] / 4; }
      const k = rnd() < 0.62 ? 1 - 0.34 * rnd() : 1 + 0.2 * rnd();
      P.push(mx * k, my * k, mz);
      const l = Math.hypot(mx, my) || 1;
      wave.push(mx / l, my / l, rnd());
      const m = P.length / 3 - 1;
      tri.push(a, b, m, b, d, m, d, c, m, c, a, m);
    } else if (rnd() < 0.5) tri.push(a, b, c, b, d, c);
    else tri.push(a, b, d, a, d, c);
  }
  // closed far end
  P.push(0, 0, -z1 * 1.15); wave.push(0, 0, 0);
  const apex = P.length / 3 - 1;
  for (let i = 0; i < N; i++) tri.push(at(i, R - 1), at(i + 1, R - 1), apex);

  const faces = tri.length / 3, points = P.length / 3;
  const t = tables(tri, faces, points);
  // inward face normals and centroids
  const nrm = new Float32Array(faces * 3), cen = new Float32Array(faces * 3);
  for (let f = 0; f < faces; f++) {
    const [a, b, c] = [tri[f * 3], tri[f * 3 + 1], tri[f * 3 + 2]];
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
    const vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (ax + P[b * 3] + P[c * 3]) / 3, my = (ay + P[b * 3 + 1] + P[c * 3 + 1]) / 3, mz = (az + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    const inward = -(nx * mx + ny * my) + (Math.hypot(mx, my) < 0.05 ? nz : 0);
    const l = Math.hypot(nx, ny, nz) || 1, sgn = inward < 0 ? -1 : 1;
    nx *= sgn / l; ny *= sgn / l; nz *= sgn / l;
    nrm.set([nx, ny, nz], f * 3); cen.set([mx, my, mz], f * 3);
  }
  // ridge light per edge: convex edges seen from inside catch the light, valleys stay dark
  const edgeOf = (f: number, k: number) => {
    const a = tri[f * 3 + ((k + 1) % 3)], b = tri[f * 3 + ((k + 2) % 3)];
    for (let q = t.nbStart[f]; q < t.nbStart[f + 1]; q++) {
      const g = t.nb[q];
      const gv = [tri[g * 3], tri[g * 3 + 1], tri[g * 3 + 2]];
      if (!gv.includes(a) || !gv.includes(b)) continue;
      const dx = cen[g * 3] - cen[f * 3], dy = cen[g * 3 + 1] - cen[f * 3 + 1], dz = cen[g * 3 + 2] - cen[f * 3 + 2];
      const ridge = dx * nrm[f * 3] + dy * nrm[f * 3 + 1] + dz * nrm[f * 3 + 2] < 0;
      const dot = nrm[f * 3] * nrm[g * 3] + nrm[f * 3 + 1] * nrm[g * 3 + 1] + nrm[f * 3 + 2] * nrm[g * 3 + 2];
      const sharp = Math.min(1, Math.max(0, (1 - dot) * 2.4));
      const pick = noise2(a * 0.37 + b * 0.37, 1.7, seed) ;   // symmetric in a, b: both faces agree on the edge
      return ridge ? (0.22 + 0.78 * sharp) * (0.3 + 0.7 * pick) : 0.05 * sharp;
    }
    return 0;
  };
  const position = new Float32Array(faces * 9), face = new Float32Array(faces * 12), edgeArr = new Float32Array(faces * 9), waveArr = new Float32Array(faces * 9);
  const vertexOf = new Uint32Array(faces * 3), depth = new Float32Array(faces), seeds = new Float32Array(faces);
  const cond = new Float32Array(faces), weight = new Float32Array(faces);
  for (let f = 0; f < faces; f++) {
    const e = [edgeOf(f, 0), edgeOf(f, 1), edgeOf(f, 2)];
    const sheen = e.indexOf(Math.max(...e));
    const s = rnd(), gloss = 0.16 + 0.84 * Math.pow(rnd(), 2.6);
    const dn = Math.min(1, Math.max(0, Math.log(-cen[f * 3 + 2] / z0) / span));
    depth[f] = dn; seeds[f] = s;
    const theta = Math.atan2(cen[f * 3 + 1], cen[f * 3] / aspect);
    cond[f] = smoothstep(0.3, 0.7, noise2(theta * 1.6 + 7, dn * 5.5, seed ^ 0x2c1b));
    weight[f] = dn < 0.82 ? 1 - dn * 0.9 : 0;
    for (let k = 0; k < 3; k++) {
      const v = tri[f * 3 + k], o = f * 3 + k;
      vertexOf[o] = v;
      position.set([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], o * 3);
      face.set([s, gloss, sheen, dn], o * 4);
      edgeArr.set(e, o * 3);
      waveArr.set([wave[v * 3], wave[v * 3 + 1], wave[v * 3 + 2]], o * 3);
    }
  }
  return {
    faces, points, position, face, edge: edgeArr, wave: waveArr, centroid: cen, depth, z0, z1, open: t.open,
    cx: new Float32Array(faces), cy: new Float32Array(faces), nbStart: t.nbStart, nb: t.nb, cond, weight, seed: seeds,
    vertexOf, pfStart: t.pfStart, pf: t.pf,
  };
}
