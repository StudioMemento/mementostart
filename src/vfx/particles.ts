import { VFX } from './config';

const STRIDE = 10; // x y vx vy size rot spin life ttl sign|heat

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Curl of a smooth scalar potential: divergence-free, so particles swirl in small local vortices. */
export function curl(x: number, y: number, out: [number, number]) {
  const f = 0.011, g = 0.017;
  // psi = sin(fx)cos(fy) + .5 sin(gx+1.7)cos(gy-.6);  v = (dpsi/dy, -dpsi/dx)
  out[0] = -Math.sin(f * x) * Math.sin(f * y) * f - 0.5 * Math.sin(g * x + 1.7) * Math.sin(g * y - 0.6) * g;
  out[1] = -(Math.cos(f * x) * Math.cos(f * y) * f + 0.5 * Math.cos(g * x + 1.7) * Math.cos(g * y - 0.6) * g);
  out[0] *= 60; out[1] *= 60;
}

/**
 * Decorative emissions: a fixed pool of short-lived triangles. They never remove content;
 * structural fragments of loading and scroll are a different thing and live in the surface meshes.
 */
export class Particles {
  readonly state = new Float32Array(VFX.particles.pool * STRIDE);
  /** Per-instance GPU data: x, y, size, rotation, life, heat. */
  readonly gpu = new Float32Array(VFX.particles.pool * 6);
  count = 0;
  limit: number = VFX.particles.pool;
  private v: [number, number] = [0, 0];

  spawn(x: number, y: number, vx: number, vy: number, heat = Math.random()) {
    if (this.count >= this.limit) return false;
    const o = this.count++ * STRIDE, p = this.state, c = VFX.particles;
    p[o] = x; p[o + 1] = y; p[o + 2] = vx; p[o + 3] = vy;
    p[o + 4] = rand(c.size[0], c.size[1]); p[o + 5] = rand(0, 6.28); p[o + 6] = rand(-6, 6);
    p[o + 7] = 1; p[o + 8] = rand(c.life[0], c.life[1]);
    // the vortex sign is fixed per particle: stable, never flipped per frame
    p[o + 9] = (Math.random() < 0.5 ? -1 : 1) * (0.05 + 0.95 * heat);
    return true;
  }

  step(dt: number) {
    const p = this.state, v = this.v, k = VFX.particles.curl;
    for (let i = this.count - 1; i >= 0; i--) {
      const o = i * STRIDE;
      p[o + 7] -= dt / p[o + 8];
      if (p[o + 7] <= 0) {
        const l = --this.count * STRIDE;
        if (l !== o) p.copyWithin(o, l, l + STRIDE);
        continue;
      }
      curl(p[o], p[o + 1], v);
      const sign = Math.sign(p[o + 9]);
      p[o + 2] += v[0] * sign * k * dt; p[o + 3] += v[1] * sign * k * dt;
      const drag = Math.exp(-dt * 2.6);
      p[o + 2] *= drag; p[o + 3] *= drag;
      p[o] += p[o + 2] * dt; p[o + 1] += p[o + 3] * dt; p[o + 5] += p[o + 6] * dt;
    }
    const g = this.gpu;
    for (let i = 0; i < this.count; i++) {
      const o = i * STRIDE, d = i * 6;
      g[d] = p[o]; g[d + 1] = p[o + 1]; g[d + 2] = p[o + 4] * (0.5 + 0.5 * p[o + 7]); g[d + 3] = p[o + 5]; g[d + 4] = p[o + 7]; g[d + 5] = Math.abs(p[o + 9]);
    }
  }

  clear() { this.count = 0; }
}
