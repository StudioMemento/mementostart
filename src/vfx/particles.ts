import { VFX } from './config';

const STRIDE = 12; // x y vx vy size rot spin life ttl sign heat owner
export const GPU_STRIDE = 7; // x y size rot life heat opacity

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Curl of a smooth scalar potential: divergence-free, so particles swirl in small local vortices. */
export function curl(x: number, y: number, out: [number, number]) {
  const f = 0.011, g = 0.017;
  out[0] = -Math.sin(f * x) * Math.sin(f * y) * f - 0.5 * Math.sin(g * x + 1.7) * Math.sin(g * y - 0.6) * g;
  out[1] = -(Math.cos(f * x) * Math.cos(f * y) * f + 0.5 * Math.cos(g * x + 1.7) * Math.cos(g * y - 0.6) * g);
  out[0] *= 60; out[1] *= 60;
}

export type ParticleKind = 'spark' | 'shard';

/**
 * Decorative emissions: a fixed pool of short-lived triangles born from lit cells. They never remove content.
 * Sparks leave glyphs; shards are larger, translucent pieces that drift out of a card and light its edge as they cross it.
 */
export class Particles {
  readonly state = new Float32Array(VFX.particles.pool * STRIDE);
  readonly gpu = new Float32Array(VFX.particles.pool * GPU_STRIDE);
  readonly opacity = new Float32Array(VFX.particles.pool);
  count = 0;
  limit: number = VFX.particles.pool;
  private v: [number, number] = [0, 0];

  spawn(kind: ParticleKind, x: number, y: number, vx: number, vy: number, owner = -1) {
    if (this.count >= this.limit) return false;
    const i = this.count++, o = i * STRIDE, p = this.state, c = VFX.particles[kind];
    p[o] = x; p[o + 1] = y; p[o + 2] = vx; p[o + 3] = vy;
    p[o + 4] = rand(c.size[0], c.size[1]); p[o + 5] = rand(0, 6.28); p[o + 6] = rand(-3, 3) * (kind === 'shard' ? 0.4 : 1);
    p[o + 7] = 1; p[o + 8] = rand(c.life[0], c.life[1]);
    // the vortex sign is fixed per particle: stable, never flipped per frame
    p[o + 9] = Math.random() < 0.5 ? -1 : 1;
    p[o + 10] = Math.random();
    p[o + 11] = owner;
    this.opacity[i] = kind === 'shard' ? rand(0.35, 0.8) : 1;
    return true;
  }

  /** Visits live particles: (x, y, life 0..1, opacity, owner). */
  each(fn: (x: number, y: number, life: number, opacity: number, owner: number) => void) {
    const p = this.state;
    for (let i = 0; i < this.count; i++) { const o = i * STRIDE; fn(p[o], p[o + 1], p[o + 7], this.opacity[i], p[o + 11]); }
  }

  step(dt: number) {
    const p = this.state, v = this.v, k = VFX.particles.curl;
    for (let i = this.count - 1; i >= 0; i--) {
      const o = i * STRIDE;
      p[o + 7] -= dt / p[o + 8];
      if (p[o + 7] <= 0) {
        const l = --this.count;
        if (l !== i) { p.copyWithin(o, l * STRIDE, l * STRIDE + STRIDE); this.opacity[i] = this.opacity[l]; }
        continue;
      }
      curl(p[o], p[o + 1], v);
      p[o + 2] += v[0] * p[o + 9] * k * dt; p[o + 3] += v[1] * p[o + 9] * k * dt;
      const drag = Math.exp(-dt * 1.6);
      p[o + 2] *= drag; p[o + 3] *= drag;
      p[o] += p[o + 2] * dt; p[o + 1] += p[o + 3] * dt; p[o + 5] += p[o + 6] * dt;
    }
    const g = this.gpu;
    for (let i = 0; i < this.count; i++) {
      const o = i * STRIDE, d = i * GPU_STRIDE;
      g[d] = p[o]; g[d + 1] = p[o + 1]; g[d + 2] = p[o + 4] * (0.55 + 0.45 * p[o + 7]); g[d + 3] = p[o + 5];
      g[d + 4] = p[o + 7]; g[d + 5] = p[o + 10]; g[d + 6] = this.opacity[i];
    }
  }

  clear() { this.count = 0; }
}
