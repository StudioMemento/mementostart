import { ClampToEdgeWrapping, DataTexture, LinearFilter, NoColorSpace, RGBAFormat, UnsignedByteType } from 'three';
import type { PlateSetName } from './math';

/**
 * The background plates: the obsidian world rendered in Blender (Cycles) as three depth planes.
 * Images are stored bottom-up (row 0 = bottom), so GL uv and image rows agree with no flip on any browser.
 *
 *   {set}_{plane}_key.webp / _glow.webp   lossy greyscale, sqrt-encoded (neutral light / light from the cracks)
 *   {set}_alpha.webp                      lossless RGB = coverage of bg / mg / fg
 *   {set}_depth.webp (half resolution)    lossless RGB = normalised disparity of bg / mg / fg
 *
 * On load they are merged into one RGBA texture per plane (R key, G glow, B alpha).
 */

export interface PlateSetInfo {
  w: number;
  h: number;
  /** Half extents of the plate, tan. */
  ext: [number, number];
  key: [string, string, string];
  glow: [string, string, string];
  alpha: string;
  depth: string;
  glints: string;
}

export interface Manifest {
  version: number;
  znear: number;
  zfar: number;
  encC: number;
  /** Median disparity of each plane: the rest focus is the midground. */
  planes: { bg: number; mg: number; fg: number };
  sets: Record<PlateSetName, PlateSetInfo>;
}

export interface Glint { x: number; y: number; w: number; layer: number; s: number }

export interface PlateSet {
  name: PlateSetName;
  info: PlateSetInfo;
  kga: DataTexture[];
  depth: DataTexture;
  /** Front-surface disparity on the CPU (~1/6 resolution), for the focus under the pointer. */
  front: Float32Array;
  frontW: number;
  frontH: number;
  glints: Glint[];
  bytes: number;
}

async function bitmap(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bkg plate ${url}: ${res.status}`);
  const blob = await res.blob();
  return { bmp: await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }), bytes: blob.size };
}

let scratch: HTMLCanvasElement | null = null;
function pixels(bmp: ImageBitmap, w = bmp.width, h = bmp.height) {
  scratch ??= document.createElement('canvas');
  scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function dataTex(data: Uint8Array, w: number, h: number) {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType);
  t.colorSpace = NoColorSpace;
  t.minFilter = LinearFilter; t.magFilter = LinearFilter;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  t.generateMipmaps = false; t.flipY = false;
  t.needsUpdate = true;
  return t;
}

export async function loadManifest(base: string): Promise<Manifest> {
  const r = await fetch(`${base}/manifest.json`);
  if (!r.ok) throw new Error(`bkg manifest: ${r.status}`);
  return r.json();
}

export async function loadPlateSet(base: string, name: PlateSetName, info: PlateSetInfo): Promise<PlateSet> {
  const u = (f: string) => `${base}/${f}`;
  const [alpha, depth, glints, ...kg] = await Promise.all([
    bitmap(u(info.alpha)),
    bitmap(u(info.depth)),
    fetch(u(info.glints)).then(r => r.json() as Promise<Glint[]>),
    ...info.key.map(f => bitmap(u(f))),
    ...info.glow.map(f => bitmap(u(f))),
  ]);
  const W = info.w, H = info.h;
  let bytes = alpha.bytes + depth.bytes;
  const ap = pixels(alpha.bmp, W, H);
  const kga: DataTexture[] = [];
  for (let L = 0; L < 3; L++) {
    const k = kg[L], g = kg[L + 3];
    bytes += k.bytes + g.bytes;
    const kp = pixels(k.bmp, W, H), gp = pixels(g.bmp, W, H);
    const out = new Uint8Array(W * H * 4);
    for (let i = 0, o = 0; i < W * H; i++, o += 4) {
      out[o] = kp[o]; out[o + 1] = gp[o]; out[o + 2] = ap[o + L]; out[o + 3] = 255;
    }
    kga.push(dataTex(out, W, H));
    k.bmp.close(); g.bmp.close();
  }
  const dp = pixels(depth.bmp);
  const dtex = dataTex(new Uint8Array(dp.buffer.slice(0)), depth.bmp.width, depth.bmp.height);
  const fw = Math.max(64, Math.round(W / 6)), fh = Math.max(64, Math.round(H / 6));
  const fa = pixels(alpha.bmp, fw, fh), fd = pixels(depth.bmp, fw, fh);
  const front = new Float32Array(fw * fh);
  for (let i = 0; i < fw * fh; i++) {
    const o = i * 4;
    let w = 0;
    if (fa[o] > 20) w = fd[o] / 255;
    if (fa[o + 1] > 127) w = fd[o + 1] / 255;
    if (fa[o + 2] > 127) w = fd[o + 2] / 255;
    front[i] = w;
  }
  alpha.bmp.close(); depth.bmp.close();
  return { name, info, kga, depth: dtex, front, frontW: fw, frontH: fh, glints, bytes };
}

/** Median of a small cross of the front surface around (u, v) in plate uv (0..1, v up): no hunting on shard edges. */
export function frontAt(p: Pick<PlateSet, 'front' | 'frontW' | 'frontH'>, u: number, v: number) {
  const xs: number[] = [];
  for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) {
    const x = Math.min(p.frontW - 1, Math.max(0, Math.round(u * (p.frontW - 1)) + dx));
    const y = Math.min(p.frontH - 1, Math.max(0, Math.round(v * (p.frontH - 1)) + dy));
    xs.push(p.front[y * p.frontW + x]);
  }
  xs.sort((a, b) => a - b);
  return xs[2];
}

export function disposePlate(p: PlateSet | null) {
  if (!p) return;
  p.kga.forEach(t => t.dispose());
  p.depth.dispose();
}
