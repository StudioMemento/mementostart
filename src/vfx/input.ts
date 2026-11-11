import { VFX } from './config';
import { rateFor } from './structure';

export interface Sample { x: number; y: number; t: number; w: number }

const SLOWEST = rateFor(VFX.pointer.release[1]);

/**
 * Input: pointer, touch, focus, viewport exit and impulses, reduced to a short list of energy samples
 * in document coordinates. One live sample follows the pointer; leaving a spot deposits its energy there,
 * and deposited samples only decay. No DOM writes, no rendering.
 */
export class PointerField {
  readonly data = new Float32Array(VFX.pointer.maxSamples * 4);   // x, y, age, strength
  count = 0;
  present = false;
  touch = false;
  /** Client coordinates of the pointer. */
  x = -9999; y = -9999;
  /** Filtered pointer speed, px/s, and its direction. */
  speed = 0; dirX = 0; dirY = 0;
  live: Sample = { x: -9999, y: -9999, t: 0, w: 0 };
  samples: Sample[] = [];
  private travel = 0;
  private lastX = -9999; private lastY = -9999;

  get radius() { return this.touch ? VFX.pointer.touchRadius : VFX.pointer.radius; }
  get active() { return this.count > 0; }

  move(x: number, y: number, touch: boolean) { this.x = x; this.y = y; this.present = true; this.touch = touch; }
  /** Pointer left the range of the page: window exit, blur, iframe, touch end. */
  leave() { this.present = false; }
  /** Cancelled gesture: switch off cleanly, without the release impulse a lifted finger gets. */
  cancel() { this.present = false; this.live.w = 0; }

  /** One-off local impulse (touch release, accordion, focus). It only decays. */
  impulse(docX: number, docY: number, strength: number, time: number) {
    this.samples.push({ x: docX, y: docY, t: time, w: strength });
    if (this.samples.length > VFX.pointer.maxSamples - 1) this.samples.shift();
  }

  update(dt: number, time: number, scrollY: number) {
    const live = this.live, docX = this.x, docY = this.y + scrollY;
    if (this.present) {
      const dx = this.x - this.lastX, dy = this.y - this.lastY, d = Math.hypot(dx, dy);
      const v = this.lastX < -9000 || dt <= 0 ? 0 : d / dt;
      this.speed += (v - this.speed) * (1 - Math.exp(-dt * 14));
      if (d > 0.5) { this.dirX = dx / d; this.dirY = dy / d; }
      if (live.w > 0.02) {
        this.travel += Math.hypot(docX - live.x, docY - live.y);
        if (this.travel > VFX.pointer.sampleStep) { this.impulse(live.x, live.y, live.w, time); this.travel = 0; }
      }
      live.x = docX; live.y = docY;
      live.w += (1 - live.w) * (1 - Math.exp(-dt / (VFX.pointer.attack * 0.4)));
    } else {
      if (live.w > 0) { this.impulse(live.x, live.y, live.w, time); live.w = 0; }
      this.speed *= Math.exp(-dt * 10);
    }
    this.lastX = this.present ? this.x : -9999; this.lastY = this.y;

    let n = 0;
    const data = this.data;
    if (live.w > 0.003) { data[0] = live.x; data[1] = live.y; data[2] = 0; data[3] = live.w; n = 1; }
    for (let i = this.samples.length - 1; i >= 0; i--) {
      const s = this.samples[i], age = time - s.t;
      if (s.w * Math.exp(-age * SLOWEST) < 0.012) { this.samples.splice(i, 1); continue; }   // tail has a defined end
      if (n < VFX.pointer.maxSamples) { data[n * 4] = s.x; data[n * 4 + 1] = s.y; data[n * 4 + 2] = age; data[n * 4 + 3] = s.w; n++; }
    }
    this.count = n;
  }
}
