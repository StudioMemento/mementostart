import { describe, expect, it, vi } from 'vitest';

// scroll.ts registers ScrollTrigger at import time; the pure energy function needs none of it
vi.mock('gsap', () => ({ default: { registerPlugin: () => {} } }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

import { VFX } from '../config';
import { buildCells, buildShards } from '../geometry';
import { PointerField } from '../input';
import { Particles } from '../particles';
import { SurfaceRegistry } from '../registry';
import { scrollEnergy } from '../scroll';

const DT = 1 / 60;

describe('scroll energy', () => {
  it('ends within the tail once the page stops, and never restarts on its own', () => {
    let e = scrollEnergy(0, 2400, DT);
    expect(e).toBe(1);
    let t = 0;
    while (e > 0 && t < 2) { e = scrollEnergy(e, 0, DT); t += DT; }
    expect(e).toBe(0);
    expect(t).toBeLessThanOrEqual(VFX.scroll.tail + DT);
    expect(t).toBeGreaterThan(0.25);
    expect(scrollEnergy(0, 0, DT)).toBe(0);
  });
});

describe('pointer field', () => {
  it('keeps a still pointer alive and ends the tail after it leaves', () => {
    const f = new PointerField();
    let time = 0;
    const run = (seconds: number) => { for (let t = 0; t < seconds; t += DT) { time += DT; f.update(DT, time, 0); } };
    f.move(300, 300, false); run(1);
    expect(f.count).toBe(1);
    expect(f.live.w).toBeGreaterThan(0.95);
    f.leave(); run(0.1);
    expect(f.active).toBe(true);                       // release tail in progress
    run(VFX.pointer.release[1] + 0.2);
    expect(f.active).toBe(false);                      // and it has a defined end
  });

  it('a cancelled touch leaves no impulse behind', () => {
    const f = new PointerField();
    f.move(100, 100, true); f.update(DT, DT, 0);
    f.cancel(); f.update(DT, 2 * DT, 0);
    expect(f.active).toBe(false);
  });
});

describe('particles', () => {
  it('never exceeds the pool and all die once emission stops', () => {
    const p = new Particles();
    for (let i = 0; i < VFX.particles.pool + 40; i++) p.spawn(0, 0, 50, 0);
    expect(p.count).toBe(VFX.particles.pool);
    for (let t = 0; t < VFX.particles.life[1] + 0.05; t += DT) p.step(DT);
    expect(p.count).toBe(0);
  });
});

describe('geometry', () => {
  it('triangulates deterministically from the seed', () => {
    const a = buildCells(640, 240, 36, 7), b = buildCells(640, 240, 36, 7);
    expect(a.triangles).toBeGreaterThan(50);
    expect(Array.from(a.position)).toEqual(Array.from(b.position));
    expect(Array.from(a.seed)).toEqual(Array.from(b.seed));
  });
  it('keeps the silhouette exact: no vertex leaves the surface box', () => {
    const m = buildCells(500, 300, 36, 3);
    for (let i = 0; i < m.position.length; i += 2) {
      expect(m.position[i]).toBeGreaterThanOrEqual(0); expect(m.position[i]).toBeLessThanOrEqual(500);
      expect(m.position[i + 1]).toBeGreaterThanOrEqual(0); expect(m.position[i + 1]).toBeLessThanOrEqual(300);
    }
  });
  it('recomposes the background for another aspect ratio with the same seed', () => {
    const wide = buildShards(1600, 900), tall = buildShards(400, 860);
    expect(Array.from(buildShards(1600, 900).position)).toEqual(Array.from(wide.position));
    expect(tall.triangles).toBeGreaterThan(40);
  });
});

describe('registry cleanup', () => {
  it('leaves no listener behind after repeated mounts', () => {
    const r = new SurfaceRegistry();
    for (let i = 0; i < 5; i++) { const off = r.subscribe(() => {}); off(); }
    expect(r.listenerCount).toBe(0);
  });
});
