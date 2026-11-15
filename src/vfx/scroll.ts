import { VFX } from './config';
import { bandEnable } from './structure';

/** Passive native scroll; no refresh or layout work during momentum. */
export class ScrollState {
  y = window.scrollY; max = 0; direction = 1;
  bandPx = 120; top = 0; bottom = 0;
  private readonly abort = new AbortController();
  constructor(onMove: () => void) {
    window.addEventListener('scroll', onMove, { passive: true, signal: this.abort.signal });
  }
  get progress() { return this.max > 0 ? this.y / this.max : 0; }
  measure(viewH: number) {
    this.max = Math.max(0, document.documentElement.scrollHeight - viewH);
    this.bandPx = Math.max(64, viewH * VFX.scroll.band);
  }
  update(reduced: boolean) {
    const next = Math.max(0, Math.min(this.max, window.scrollY));
    if (next !== this.y) this.direction = next > this.y ? 1 : -1;
    this.y = next;
    const k = reduced ? { top: 0, bottom: 0 } : bandEnable(this.y, this.max, this.bandPx);
    this.top = k.top; this.bottom = k.bottom;
  }
  destroy() { this.abort.abort(); }
}
