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

export interface ShardField { position: Float32Array; data: Float32Array; grad: Float32Array; triangles: number }

/**
 * Background: one continuous faceted surface built from oblique directrices.
 * A base layer of long plates covers the whole viewport (no holes); blades are laid over it toward the frame.
 * Per vertex: position (viewport px), grad 0..1 (shading runs along the face), data = seed, tone, gloss edge, layer.
 */
export function buildShards(width: number, height: number, seed = 20240611): ShardField {
  const rnd = mulberry(seed);
  const diag = Math.hypot(width, height);
  const theta = -0.5;                       // main directrix: rising toward the right, as on the boards
  const ux = Math.cos(theta), uy = Math.sin(theta), vx = -uy, vy = ux;
  const tris: number[] = [], data: number[] = [], grad: number[] = [];
  const add = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, layer: number, tone: number) => {
    tris.push(ax, ay, bx, by, cx, cy);
    const s = rnd(), edge = Math.floor(rnd() * 3), g0 = rnd() < 0.5 ? 0 : 1;
    const g = [g0, 1 - g0, rnd()];
    for (let i = 0; i < 3; i++) { data.push(s, tone, edge, layer); grad.push(g[i]); }
  };

  // base plates: a sheared grid aligned to the directrix, long along u and narrow along v
  const cu = Math.max(260, diag * 0.24), cv = Math.max(92, diag * 0.085);
  const nu = Math.ceil(diag / cu) + 2, nv = Math.ceil(diag / cv) + 2;
  const cx0 = width / 2, cy0 = height / 2;
  const P: [number, number][] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = (i - nu / 2 + (j % 2) * 0.5 + (rnd() - 0.5) * 0.7) * cu, v = (j - nv / 2 + (rnd() - 0.5) * 0.62) * cv;
    P.push([cx0 + ux * u + vx * v, cy0 + uy * u + vy * v]);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = P[j * (nu + 1) + i], b = P[j * (nu + 1) + i + 1], c = P[(j + 1) * (nu + 1) + i], d = P[(j + 1) * (nu + 1) + i + 1];
    const tone = rnd();
    if (rnd() < 0.5) { add(a[0], a[1], b[0], b[1], c[0], c[1], 0, tone); add(b[0], b[1], d[0], d[1], c[0], c[1], 0, rnd()); }
    else { add(a[0], a[1], b[0], b[1], d[0], d[1], 0, tone); add(a[0], a[1], d[0], d[1], c[0], c[1], 0, rnd()); }
  }

  // blades: long thin faces gathered toward the frame, a third of them crossing the main directrix
  const blades = Math.round(44 + (width * height) / 38000);
  for (let n = 0; n < blades; n++) {
    // rejection-sample an anchor away from the reading centre
    let ax = 0, ay = 0, r = 0;
    for (let k = 0; k < 8; k++) {
      ax = rnd() * 1.2 - 0.1; ay = rnd() * 1.2 - 0.1;
      const nxn = (ax - 0.5) * 2, nyn = (ay - 0.5) * 2;
      r = Math.pow(Math.pow(Math.abs(nxn), 2.4) + Math.pow(Math.abs(nyn) * 0.85, 2.4), 1 / 2.4);
      if (r > 0.62 + rnd() * 0.25) break;
    }
    const cross = rnd() < 0.18;
    const ang = theta + (cross ? 1.25 + (rnd() - 0.5) * 0.7 : (rnd() - 0.5) * 0.42);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const len = diag * (0.22 + rnd() * 0.46) * (cross ? 0.6 : 1) * Math.min(1.25, 0.55 + r * 0.6);
    const wid = len * (0.035 + rnd() * 0.13);
    const x = ax * width, y = ay * height, side = rnd() < 0.5 ? -1 : 1, slide = (rnd() - 0.5) * 0.7 * len;
    add(x - dx * len / 2, y - dy * len / 2, x + dx * len / 2, y + dy * len / 2,
      x + dx * slide - dy * wid * side, y + dy * slide + dx * wid * side, 1 + n / blades, rnd());
  }
  return { position: new Float32Array(tris), data: new Float32Array(data), grad: new Float32Array(grad), triangles: tris.length / 6 };
}
