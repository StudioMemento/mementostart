import { describe, expect, it } from 'vitest';
import { VFX } from '../config';
import { decode, encode, hexTaps, nsoft, plateSetFor, ringCover, scrollFocus, springStep, tapCount, viewHalf } from '../bkg/math';
import { frontAt } from '../bkg/plate';

const EXT = { landscape: [0.56, 0.42], landscape_m: [0.56, 0.42], portrait: [0.42, 0.56] } as const;

describe('background: hexagonal depth of field', () => {
  it('lays the taps on hexagonal rings, one ring at a time', () => {
    for (const rings of [3, 4, 6]) {
      const t = hexTaps(rings), n = tapCount(rings);
      const seen = new Set<string>();
      for (let i = 0; i < n; i++) {
        const [x, y, k] = [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]];
        // hexagonal distance of the tap (rotated 15°): the ring it belongs to
        const a = (-Math.PI) / 12, rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a);
        const c = Math.sqrt(3) / 2, hex = Math.max(Math.abs(ry) / c, (Math.abs(ry) / c + 2 * Math.abs(rx)) / 2);
        expect(hex).toBeCloseTo(k, 4);
        seen.add(`${x.toFixed(3)},${y.toFixed(3)}`);
      }
      expect(seen.size).toBe(n);
    }
  });

  it('preserves a uniform region exactly, at every circle of confusion', () => {
    for (const rings of [3, 4, 6]) {
      for (let x = 0; x <= rings + 0.5; x += 0.13) {
        let sum = 0;
        for (let k = 0; k <= rings; k++) sum += (k === 0 ? 1 : 6 * k) * ringCover(k, x);
        expect(sum / nsoft(x, rings)).toBeCloseTo(1, 6);
      }
    }
  });

  it('spreads an isolated highlight into a flat hexagon', () => {
    const rings = 6, x = 4.2, w = (k: number) => ringCover(k, x) / nsoft(x, rings);
    expect(w(1)).toBeCloseTo(w(0), 6);
    expect(w(3)).toBeCloseTo(w(0), 6);
    expect(w(5)).toBe(0);
  });
});

describe('background: framing', () => {
  it('the long side always reaches the edge of the world, on every screen', () => {
    for (const [w, h] of [[3440, 1440], [2560, 1440], [1600, 900], [1440, 900], [1024, 768], [412, 915], [390, 844]]) {
      const [hx, hy] = viewHalf(w, h, VFX.bkg.viewLongHalf, VFX.bkg.viewShortCap);
      expect(Math.max(hx, hy)).toBeCloseTo(VFX.bkg.viewLongHalf, 6);
    }
  });

  it('every aspect ratio, scroll dolly and drift included, stays inside its plate', () => {
    const S = VFX.bkg.scroll;
    for (let aspect = 0.4; aspect <= 3.6; aspect += 0.02) {
      const w = 1000 * aspect, h = 1000;
      for (const q of ['high', 'medium', 'low'] as const) {
        const set = plateSetFor(w, h, q), ext = EXT[set];
        const [hx, hy] = viewHalf(w, h, VFX.bkg.viewLongHalf, VFX.bkg.viewShortCap);
        for (let s = 0; s <= 1; s += 0.05) for (let L = 0; L < 3; L++) {
          const dz = 1 + s * S.dolly[L];
          expect(hx / dz).toBeLessThanOrEqual(ext[0] + 1e-9);
          expect(hy / dz + s * S.shift[L]).toBeLessThanOrEqual(ext[1] + 1e-9);
        }
      }
    }
  });

  it('only an orientation change (or the quality) swaps the plate', () => {
    expect(plateSetFor(1920, 1080, 'high')).toBe('landscape');
    expect(plateSetFor(1280, 720, 'high')).toBe('landscape');
    expect(plateSetFor(1920, 1080, 'medium')).toBe('landscape_m');
    expect(plateSetFor(390, 844, 'medium')).toBe('portrait');
    expect(plateSetFor(800, 1000, 'high')).toBe('portrait');
  });
});

describe('background: focus', () => {
  it('racks slowly, with a slight overshoot, and settles', () => {
    const F = VFX.bkg.focus;
    let x = 0.22, v = 0, peak = 0, t = 0, settled = -1;
    for (let i = 0; i < 600; i++) {
      [x, v] = springStep(x, v, 0.49, 1 / 60, F.period, F.damping);
      t += 1 / 60;
      peak = Math.max(peak, x);
      if (settled < 0 && t > 0.3 && Math.abs(x - 0.49) < 0.005 && Math.abs(v) < 0.01) settled = t;
    }
    expect(peak).toBeGreaterThan(0.49);                 // the focus puller's overshoot
    expect(peak - 0.49).toBeLessThan(0.1 * (0.49 - 0.22));
    expect(settled).toBeGreaterThan(0.6);              // never a snap
    expect(settled).toBeLessThan(3.5);
  });

  it('on touch, the scroll racks it through the planes and back to the midground', () => {
    const P = { bg: 0.036, mg: 0.223, fg: 0.486 };
    expect(scrollFocus(0, P)).toBeCloseTo(P.mg, 6);
    expect(scrollFocus(1 / 3, P)).toBeCloseTo(P.fg - 0.05, 6);
    expect(scrollFocus(2 / 3, P)).toBeCloseTo(P.bg + 0.02, 6);
    expect(scrollFocus(1, P)).toBeCloseTo(P.mg, 2);
    let prev = scrollFocus(0, P);
    for (let s = 0.01; s <= 1; s += 0.01) { const f = scrollFocus(s, P); expect(Math.abs(f - prev)).toBeLessThan(0.03); prev = f; }
  });

  it('reads the surface under the pointer with a median: one stray texel never moves the focus', () => {
    const W = 64, H = 64, front = new Float32Array(W * H).fill(0.3);
    front[32 * W + 32] = 0.9;
    expect(frontAt({ front, frontW: W, frontH: H }, 32 / 63, 32 / 63)).toBeCloseTo(0.3, 6);
  });
});

describe('background: plates', () => {
  it('decodes what the packer encodes', () => {
    for (const x of [0, 0.001, 0.02, 0.3, 1, 4, 9]) expect(decode(encode(x, 0.6), 0.6)).toBeCloseTo(x, x > 4 ? 0 : 3);
  });
});
