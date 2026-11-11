import { VFX } from './config';

/**
 * Input: pointer, touch and viewport exit, reduced to a position, a presence flag and a filtered speed.
 * What the pointer does to the surfaces (ignitions) is decided by the engine; no DOM writes, no rendering here.
 */
export class PointerField {
  present = false;
  touch = false;
  /** Client coordinates of the pointer. */
  x = -9999; y = -9999;
  /** Filtered speed (px/s), direction, and time since the pointer last moved (s). */
  speed = 0; dirX = 0; dirY = 0; still = 0;
  private lastX = -9999; private lastY = -9999;

  get radius() { return this.touch ? VFX.pointer.touchRadius : VFX.pointer.radius; }

  move(x: number, y: number, touch: boolean) { this.x = x; this.y = y; this.present = true; this.touch = touch; }
  /** Pointer left the range of the page: window exit, blur, iframe, touch end. */
  leave() { this.present = false; }
  /** Cancelled gesture: switch off cleanly. */
  cancel() { this.present = false; this.speed = 0; }

  update(dt: number) {
    if (this.present) {
      const dx = this.x - this.lastX, dy = this.y - this.lastY, d = Math.hypot(dx, dy);
      const v = this.lastX < -9000 || dt <= 0 ? 0 : d / dt;
      this.speed += (v - this.speed) * (1 - Math.exp(-dt * 14));
      if (d > 0.5) { this.dirX = dx / d; this.dirY = dy / d; this.still = 0; } else this.still += dt;
    } else this.speed *= Math.exp(-dt * 10);
    this.lastX = this.present ? this.x : -9999; this.lastY = this.y;
  }
}
