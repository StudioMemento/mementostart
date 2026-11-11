import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VFX } from './config';
import { bandEnable, clamp01, rateFor } from './structure';

gsap.registerPlugin(ScrollTrigger);

/** Scroll energy after `dt`: follows the speed while the page moves, then decays to nothing within the tail. */
export function scrollEnergy(previous: number, speed: number, dt: number) {
  const target = clamp01(speed / VFX.scroll.velocityRef);
  const decayed = previous * Math.exp(-dt * rateFor(VFX.scroll.tail));
  const e = Math.max(target, decayed);
  return e < 0.02 ? 0 : e;
}

/**
 * Scroll: native position, filtered velocity, bands. Position drives structure; velocity only feeds energy.
 * ScrollTrigger observes the native scroller, nothing is intercepted, pinned or snapped.
 */
export class ScrollState {
  y = 0; max = 0; direction = 1; energy = 0; speed = 0;
  bandPx = 120; top = 0; bottom = 0;
  private trigger: ScrollTrigger;
  private pending = 0;

  constructor(onMove: () => void) {
    this.y = window.scrollY;
    this.trigger = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => { this.pending = Math.abs(self.getVelocity()); this.direction = self.direction || 1; onMove(); },
    });
  }

  measure(viewH: number) {
    this.max = Math.max(0, document.documentElement.scrollHeight - viewH);
    this.bandPx = Math.max(64, viewH * VFX.scroll.band);
  }

  update(dt: number, reduced: boolean) {
    this.y = window.scrollY;
    this.speed += (this.pending - this.speed) * (1 - Math.exp(-dt * 18));
    this.pending = 0;
    this.energy = reduced ? 0 : scrollEnergy(this.energy, this.speed, dt);
    const k = reduced ? { top: 0, bottom: 0 } : bandEnable(this.y, this.max, this.bandPx);
    this.top = k.top; this.bottom = k.bottom;
  }

  destroy() { this.trigger.kill(); }
}
