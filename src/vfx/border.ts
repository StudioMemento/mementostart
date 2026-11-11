import { VFX } from './config';

/** Position 0..1 along a w×h outline (clockwise from the top-left corner) and distance to it. Mirrors `outlineAt`. */
export function outline(px: number, py: number, w: number, h: number): [number, number] {
  const qx = Math.min(w, Math.max(0, px)), qy = Math.min(h, Math.max(0, py));
  const dT = qy, dR = w - qx, dB = h - qy, dL = qx, m = Math.min(dT, dR, dB, dL);
  const s = m === dT ? qx : m === dR ? w + qy : m === dB ? w + h + (w - qx) : 2 * w + h + (h - qy);
  const outside = Math.hypot(px - qx, py - qy);
  return [s / (2 * (w + h)), outside > 0 ? outside : m];
}

/**
 * Light along a card's outline, in segments. Sources: lit cells near the edge, shards crossing it, and the pointer
 * approaching from outside (the nearest stretch lights before the pointer enters). It only ever decays on its own.
 */
export class BorderLight {
  readonly bins = new Float32Array(VFX.border.bins);
  level = 0;
  private tmp = new Float32Array(VFX.border.bins);

  decay(dt: number) {
    const k = Math.exp(-dt * VFX.border.decay);
    for (let i = 0; i < this.bins.length; i++) this.bins[i] *= k;
  }

  /** Raises the light around position s (0..1), spread over `width` segments. */
  add(s: number, value: number, width = 1.5) {
    const n = this.bins.length, c = s * n, r = Math.ceil(width * 2);
    for (let d = -r; d <= r; d++) {
      const i = ((Math.round(c) + d) % n + n) % n;
      const v = value * Math.exp(-(d * d) / (width * width));
      if (v > this.bins[i]) this.bins[i] = v;
    }
  }

  /** A short travel along the edge: light leaks a little into the next segments. */
  settle() {
    const b = this.bins, t = this.tmp, n = b.length;
    let level = 0;
    for (let i = 0; i < n; i++) t[i] = Math.max(b[i], 0.46 * (b[(i + n - 1) % n] + b[(i + 1) % n]));
    for (let i = 0; i < n; i++) { const v = Math.min(1.2, t[i]); b[i] = v < 0.004 ? 0 : v; if (v > level) level = v; }
    this.level = level;
  }
}
