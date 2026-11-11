import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VFX } from './config';
import { bandEnable } from './structure';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll: native position and bands. Position drives structure and nothing else: the tessellation stays monochrome.
 * ScrollTrigger observes the native scroller; nothing is intercepted, pinned or snapped.
 */
export class ScrollState {
  y = 0; max = 0; direction = 1;
  bandPx = 120; top = 0; bottom = 0;
  private trigger: ScrollTrigger;

  constructor(onMove: () => void) {
    this.y = window.scrollY;
    this.trigger = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => { this.direction = self.direction || 1; onMove(); },
    });
  }

  get progress() { return this.max > 0 ? this.y / this.max : 0; }

  measure(viewH: number) {
    this.max = Math.max(0, document.documentElement.scrollHeight - viewH);
    this.bandPx = Math.max(64, viewH * VFX.scroll.band);
  }

  update(reduced: boolean) {
    this.y = window.scrollY;
    const k = reduced ? { top: 0, bottom: 0 } : bandEnable(this.y, this.max, this.bandPx);
    this.top = k.top; this.bottom = k.bottom;
  }

  destroy() { this.trigger.kill(); }
}
