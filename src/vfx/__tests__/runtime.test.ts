import { describe, expect, it, vi } from 'vitest';

// scroll.ts registers ScrollTrigger at import time; nothing here needs it
vi.mock('gsap', () => ({ default: { registerPlugin: () => {} } }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

import { BorderLight, outline } from '../border';
import { ChainField } from '../chain';
import { VFX } from '../config';
import { buildArch, buildNetwork, mulberry } from '../geometry';
import { PointerField } from '../input';
import { Particles } from '../particles';
import { encodeDistance, signedDistance } from '../sdf';
import { SurfaceRegistry } from '../registry';

const DT = 1 / 60;
const run = (c: ChainField, seconds: number) => { for (let t = 0; t < seconds; t += DT) c.step(DT); };

describe('chain reaction', () => {
  const net = buildNetwork(640, 330, 64, 30, 200, 7);

  it('travels beyond the ignited cell and always comes to an end', () => {
    const c = new ChainField(net, VFX.chain.card, mulberry(1));
    for (let f = 0; f < net.faces; f++) net.cond[f] = net.weight[f] ? 1 : 0;
    const start = c.nearest(320, 165);
    c.ignite(start, 1);
    const lit = new Set<number>();
    for (let t = 0; t < 0.8; t += DT) { c.step(DT); c.shown.forEach((v, i) => { if (v > 0.05) lit.add(i); }); }
    expect(lit.size).toBeGreaterThan(4);                       // a reaction, not a single cell
    run(c, 3);
    expect(c.active).toBe(false);                              // with no source, it ends
    expect(Math.max(...c.shown)).toBe(0);
  });

  it('dies in non-conductive zones', () => {
    const c = new ChainField(net, VFX.chain.card, mulberry(2));
    net.cond.fill(0);
    c.ignite(c.nearest(320, 165), 1);
    let lit = 0;
    for (let t = 0; t < 1; t += DT) { c.step(DT); lit = Math.max(lit, c.shown.filter(v => v > 0.02).length); }
    expect(lit).toBeLessThanOrEqual(1);
  });

  it('rests a cell after it lights: a sustained source cannot pin a cell at full light', () => {
    const c = new ChainField(net, VFX.chain.card, mulberry(3));
    const cell = c.nearest(100, 100);
    c.ignite(cell, 1); c.step(DT);
    const first = c.raw[cell];
    run(c, 0.2);
    c.ignite(cell, 1); c.step(DT);
    expect(c.raw[cell]).toBeLessThan(first);                    // refractory: the second spark was ignored
  });

  it('quench stops every pending spark of a cancelled gesture', () => {
    const c = new ChainField(net, VFX.chain.card, mulberry(4));
    net.cond.fill(1);
    for (let i = 0; i < 6; i++) c.igniteAt(320, 165, 60, 1);
    c.quench();
    run(c, 2);
    expect(c.active).toBe(false);
  });

  it('writes a face value and a smoothed vertex value for every rendered vertex', () => {
    const c = new ChainField(net, VFX.chain.card, mulberry(5));
    c.ignite(c.nearest(320, 165), 1); run(c, 0.2);
    const out = new Float32Array(net.faces * 6);
    c.write(out);
    expect(Math.max(...out)).toBeGreaterThan(0.3);
    expect(out.every(v => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('geometry', () => {
  it('surface networks are irregular, deterministic and cover the surface plus its margin', () => {
    const a = buildNetwork(640, 330, 64, 30, 200, 9), b = buildNetwork(640, 330, 64, 30, 200, 9);
    expect(Array.from(a.position)).toEqual(Array.from(b.position));
    expect(a.faces).toBeGreaterThan(60);
    expect(a.faces).toBeLessThan(260);                          // low density on cards
    let minX = 0, maxX = 0;
    for (let i = 0; i < a.position.length; i += 2) { minX = Math.min(minX, a.position[i]); maxX = Math.max(maxX, a.position[i]); }
    expect(minX).toBe(-30); expect(maxX).toBe(670);
    const areas: number[] = [];
    for (let f = 0; f < a.faces; f++) {
      const p = a.position, o = f * 6;
      areas.push(Math.abs((p[o + 2] - p[o]) * (p[o + 5] - p[o + 1]) - (p[o + 4] - p[o]) * (p[o + 3] - p[o + 1])) / 2);
    }
    areas.sort((x, y) => x - y);
    expect(areas[Math.floor(areas.length * 0.9)] / areas[Math.floor(areas.length * 0.1)]).toBeGreaterThan(3);   // mixed sizes
  });

  it('the background is one sheet without holes: the only open edges are its outer border', () => {
    for (const [aspect, h] of [[16 / 9, 900], [1.5, 800], [0.46, 844], [2.39, 1440]] as const) {
      const t = buildArch(aspect, h);
      expect(t.open).toBe(t.border);
      expect(t.faces).toBeGreaterThan(3000);                    // dense
      expect(t.faces).toBeLessThan(40000);                      // and still light
      // no fill triangles: every face is about as large as its neighbours (none spans from the walls to the centre)
      let worst = 0;
      const T = Math.tan((52 * Math.PI) / 360);
      for (let f = 0; f < t.faces; f++) {
        const o = f * 9, p = t.position, z = -(p[o + 2] + p[o + 5] + p[o + 8]) / 3;
        // a face beyond the top or the bottom of the view, all three corners, is never seen
        const side = [0, 3, 6].map(k => Math.sign(p[o + k + 1]) * (Math.abs(p[o + k + 1]) > -p[o + k + 2] * T ? 1 : 0));
        if (side[0] !== 0 && side.every(v => v === side[0])) continue;
        const lat = [0, 3, 6].map(k => Math.sign(p[o + k]) * (Math.abs(p[o + k]) > -p[o + k + 2] * T * aspect ? 1 : 0));
        if (lat[0] !== 0 && lat.every(v => v === lat[0])) continue;
        const e = Math.max(Math.hypot(p[o] - p[o + 3], p[o + 1] - p[o + 4], p[o + 2] - p[o + 5]), Math.hypot(p[o + 3] - p[o + 6], p[o + 4] - p[o + 7], p[o + 5] - p[o + 8]), Math.hypot(p[o + 6] - p[o], p[o + 7] - p[o + 1], p[o + 8] - p[o + 2]));
        worst = Math.max(worst, e / z);
      }
      expect(worst).toBeLessThan(0.6);                           // screen-relative size of the largest face
    }
  });

  it('cells get smaller toward the centre, and depth depends on the horizontal only (vertical bands)', () => {
    const aspect = 1.6, t = buildArch(aspect, 900), T = Math.tan((52 * Math.PI) / 360);
    const sx = (o: number) => t.position[o] / (-t.position[o + 2] * T * aspect), sy = (o: number) => t.position[o + 1] / (-t.position[o + 2] * T);
    const byBand: number[][] = [[], [], [], [], []];
    const depthAtX = new Map<number, number[]>();
    for (let f = 0; f < t.faces; f++) {
      const o = f * 9;
      const cx = (sx(o) + sx(o + 3) + sx(o + 6)) / 3, cy = (sy(o) + sy(o + 3) + sy(o + 6)) / 3;
      if (Math.abs(cx) > 1 || Math.abs(cy) > 1) continue;
      const len = Math.max(Math.hypot(sx(o + 3) - sx(o), sy(o + 3) - sy(o)), Math.hypot(sx(o + 6) - sx(o + 3), sy(o + 6) - sy(o + 3)));
      byBand[Math.min(4, Math.floor(Math.abs(cx) * 5))].push(len);
      const key = Math.round(cx * 10);
      if (!depthAtX.has(key)) depthAtX.set(key, []);
      depthAtX.get(key)!.push(t.depth[f]);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(byBand[4])).toBeGreaterThan(mean(byBand[0]) * 6);   // perspective: the size tells the depth
    expect(mean(byBand[4]) / 2).toBeGreaterThan(0.1);                // foreground cells: over a tenth of the viewport height
    // within one column of the screen, depth barely changes from top to bottom
    for (const list of depthAtX.values()) if (list.length > 10) {
      const m = mean(list), sd = Math.sqrt(mean(list.map(v => (v - m) ** 2)));
      expect(sd).toBeLessThan(0.08);
    }
  });

  it('structural cells keep the silhouette exact and differ in size', () => {
    const m = buildNetwork(500, 300, 21, 0, 200, 3);
    for (let i = 0; i < m.position.length; i += 2) {
      expect(m.position[i]).toBeGreaterThanOrEqual(0); expect(m.position[i]).toBeLessThanOrEqual(500);
      expect(m.position[i + 1]).toBeGreaterThanOrEqual(0); expect(m.position[i + 1]).toBeLessThanOrEqual(300);
    }
  });
});

describe('outline light', () => {
  it('maps points to the nearest stretch of the outline and decays to nothing', () => {
    expect(outline(320, -10, 640, 330)[0]).toBeCloseTo(320 / 1940, 3);
    expect(outline(650, 100, 640, 330)[1]).toBeCloseTo(10, 5);
    const b = new BorderLight();
    b.add(0.25, 1); b.settle();
    expect(b.level).toBeGreaterThan(0.9);
    for (let t = 0; t < 3; t += DT) { b.decay(DT); b.settle(); }
    expect(b.level).toBe(0);
  });
});

describe('pointer', () => {
  it('measures speed and stillness', () => {
    const f = new PointerField();
    f.move(0, 0, false); f.update(DT);
    f.move(10, 0, false); f.update(DT);
    expect(f.speed).toBeGreaterThan(50);
    for (let i = 0; i < 60; i++) f.update(DT);
    expect(f.still).toBeGreaterThan(0.9);
    f.cancel();
    expect(f.present).toBe(false);
  });
});

describe('particles', () => {
  it('never exceeds the pool and all die once emission stops', () => {
    const p = new Particles();
    for (let i = 0; i < VFX.particles.pool + 40; i++) p.spawn(i % 2 ? 'shard' : 'spark', 0, 0, 50, 0);
    expect(p.count).toBe(VFX.particles.pool);
    for (let t = 0; t < VFX.particles.shard.life[1] + 0.05; t += DT) p.step(DT);
    expect(p.count).toBe(0);
  });
});

describe('registry cleanup', () => {
  it('leaves no listener behind after repeated mounts', () => {
    const r = new SurfaceRegistry();
    for (let i = 0; i < 5; i++) { const off = r.subscribe(() => {}); off(); }
    expect(r.listenerCount).toBe(0);
  });
});

describe('type glow and card topology', () => {
  it('the distance field follows the shape: negative inside, zero on the outline, positive outside', () => {
    const w = 64, h = 64, a = new Uint8Array(w * h);
    for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) a[y * w + x] = 255;
    const d = signedDistance(a, w, h);
    expect(d[32 * w + 32]).toBeLessThan(-14);                   // centre of a 32 px square: ~16 px inside
    expect(d[32 * w + 4]).toBeGreaterThan(10);                  // 12 px to the left of it
    expect(Math.abs(d[32 * w + 16])).toBeLessThanOrEqual(1);    // on the edge (hard pixels: within one)
    const e = encodeDistance(d, 1, 12);
    expect(e[32 * w + 16]).toBeGreaterThan(110); expect(e[32 * w + 16]).toBeLessThan(145);
    expect(e[32 * w + 32]).toBe(0); expect(e[0]).toBe(255);
  });

  it('card cells are fine along the outline and large in the middle', () => {
    const W = 640, H = 330, m = buildNetwork(W, H, 62, 30, 170, 5, { spacing: 15, reach: 120 });
    const edge: number[] = [], mid: number[] = [];
    for (let f = 0; f < m.faces; f++) {
      const o = f * 6, x = m.cx[f], y = m.cy[f];
      if (x < 0 || y < 0 || x > W || y > H) continue;
      const area = Math.abs((m.position[o + 2] - m.position[o]) * (m.position[o + 5] - m.position[o + 1]) - (m.position[o + 4] - m.position[o]) * (m.position[o + 3] - m.position[o + 1])) / 2;
      const d = Math.min(x, y, W - x, H - y);
      if (d < 30) edge.push(area); else if (d > 120) mid.push(area);
      const k = m.cell[f * 12 + 3];
      expect(k).toBeGreaterThanOrEqual(0); expect(k).toBeLessThanOrEqual(1);
    }
    const median = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
    expect(edge.length).toBeGreaterThan(mid.length);
    expect(median(mid)).toBeGreaterThan(median(edge) * 4);
  });
});

describe('type range', () => {
  it('the pointer presence is written with the reaction and keeps the field active until it fades', () => {
    const net = buildNetwork(400, 200, 30, 10, 120, 3);
    const ch = new ChainField(net, VFX.chain.title);
    const out = new Float32Array(net.faces * 6);
    expect(ch.active).toBe(false);
    const f = net.faces >> 1;
    ch.drive[f] = 0.8; ch.driveLevel = 0.8;
    expect(ch.active).toBe(true);
    ch.write(out);
    expect(out[f * 6]).toBeCloseTo(0.8, 5);                    // the face shows the presence
    expect(Math.max(...Array.from(out))).toBeLessThanOrEqual(0.8 + 1e-6);
    ch.drive.fill(0); ch.driveLevel = 0;
    expect(ch.active).toBe(false);
  });
});
