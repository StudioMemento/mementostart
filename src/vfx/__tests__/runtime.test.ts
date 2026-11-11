import { describe, expect, it, vi } from 'vitest';

// scroll.ts registers ScrollTrigger at import time; nothing here needs it
vi.mock('gsap', () => ({ default: { registerPlugin: () => {} } }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

import { BorderLight, outline } from '../border';
import { ChainField } from '../chain';
import { VFX } from '../config';
import { buildCells, buildNetwork, buildTunnel, mulberry } from '../geometry';
import { PointerField } from '../input';
import { Particles } from '../particles';
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

  it('the background is one closed surface: every edge is shared except the near rim, off screen', () => {
    for (const aspect of [16 / 9, 1.5, 0.46]) {
      const t = buildTunnel(aspect);
      expect(t.open).toBe(VFX.background.around);
      for (let f = 0; f < t.faces; f++) expect(t.nbStart[f + 1] - t.nbStart[f]).toBeGreaterThanOrEqual(2);
    }
  });

  it('cells get smaller and darker toward the vanishing point', () => {
    const t = buildTunnel(1.6);
    const near: number[] = [], far: number[] = [];
    for (let f = 0; f < t.faces; f++) {
      // projected size on screen: the longest edge after perspective division
      const p = t.position, o = f * 9;
      const sx = (k: number) => p[o + k * 3] / -p[o + k * 3 + 2], sy = (k: number) => p[o + k * 3 + 1] / -p[o + k * 3 + 2];
      const len = Math.max(Math.hypot(sx(1) - sx(0), sy(1) - sy(0)), Math.hypot(sx(2) - sx(1), sy(2) - sy(1)), Math.hypot(sx(0) - sx(2), sy(0) - sy(2)));
      (t.depth[f] < 0.3 ? near : t.depth[f] > 0.6 ? far : []).push(len);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(near)).toBeGreaterThan(mean(far) * 4);
  });

  it('structural cells keep the silhouette exact', () => {
    const m = buildCells(500, 300, 36, 3);
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
