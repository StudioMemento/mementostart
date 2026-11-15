/** A bounded set of viewport-space waves. No layout reads or DOM writes in the render loop. */
export const TOUCH_TRAVEL_MS = 950;
export const TOUCH_LIFE_MS = 1200;
export const TOUCH_POOL = 4;
export interface TouchWave {
  x: number; y: number; width: number; height: number;
  reach: number; band: number; start: number; radius: number; strength: number;
}
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export class TouchPulseField {
  readonly waves: TouchWave[] = [];
  started = 0;
  get active() { return this.waves.length > 0; }
  start(x: number, y: number, width: number, height: number, now: number) {
    this.update(now);
    const band = Math.max(70, Math.min(120, height * 0.12));
    const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + band;
    const wave: TouchWave = { x, y, width, height, reach, band, start: now, radius: 0, strength: 1 };
    if (this.waves.length >= TOUCH_POOL) this.waves.shift();
    this.waves.push(wave); this.started++;
    return wave;
  }
  update(now: number) {
    let keep = 0;
    for (const w of this.waves) {
      const age = Math.max(0, now - w.start);
      if (age >= TOUCH_LIFE_MS) continue;
      w.radius = w.reach * age / TOUCH_TRAVEL_MS;
      w.strength = 1 - smooth((age - 600) / 600);
      this.waves[keep++] = w;
    }
    this.waves.length = keep;
  }
  clear() { this.waves.length = 0; }
  at(x: number, y: number) {
    let energy = 0;
    for (const w of this.waves) {
      if (x < 0 || y < 0 || x > w.width || y > w.height) continue;
      const gap = Math.abs(Math.hypot(x - w.x, y - w.y) - w.radius);
      energy = Math.max(energy, (1 - smooth(gap / w.band)) * w.strength);
    }
    return energy;
  }
  /** Whole-title warmth when the front crosses any part of the title, including its glyph gaps. */
  across(x: number, y: number, width: number, height: number) {
    let energy = 0;
    for (const w of this.waves) {
      const left = Math.max(0, x), top = Math.max(0, y);
      const right = Math.min(w.width, x + width), bottom = Math.min(w.height, y + height);
      if (right < left || bottom < top) continue;
      const nearest = Math.hypot(Math.max(left - w.x, 0, w.x - right), Math.max(top - w.y, 0, w.y - bottom));
      const farthest = Math.hypot(Math.max(Math.abs(left - w.x), Math.abs(right - w.x)), Math.max(Math.abs(top - w.y), Math.abs(bottom - w.y)));
      const gap = Math.max(nearest - w.radius, 0, w.radius - farthest);
      energy = Math.max(energy, (1 - smooth(gap / w.band)) * w.strength);
    }
    return energy;
  }
}

/** One wave on contact, including controls/shadow DOM. Release/cancel never duplicates or erases it. */
export function listenForTouch(target: EventTarget, start: (x: number, y: number) => void, signal: AbortSignal) {
  target.addEventListener('pointerdown', event => {
    const e = event as PointerEvent;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') start(e.clientX, e.clientY);
  }, { capture: true, passive: true, signal });
}
