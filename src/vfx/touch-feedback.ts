import { listenForTouch, TOUCH_POOL, TOUCH_TRAVEL_MS, TouchPulseField } from './touch';

/** Compositor-only ring + plain-DOM title fallback; the same wave drives GPU cells when available. */
export function installTouchFeedback(field: TouchPulseField, layer: HTMLDivElement) {
  const abort = new AbortController();
  const animations = new Map<HTMLElement, Animation>();
  const timers = new Set<number>();
  const lit = new Set<HTMLElement>();
  const generations = new WeakMap<HTMLElement, number>();
  const later = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, delay);
    timers.add(id);
  };
  const start = (x: number, y: number) => {
    if (document.hidden || (window as { __TIDE_VISIBLE__?: boolean }).__TIDE_VISIBLE__ === false || matchMedia('(forced-colors: active)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const w = field.start(x, y, document.documentElement.clientWidth, innerHeight, performance.now());
    const ring = document.createElement('i');
    ring.className = 'touch-ripple';
    ring.style.cssText = `left:${x-w.reach}px;top:${y-w.reach}px;width:${w.reach*2}px;height:${w.reach*2}px`;
    while (animations.size >= TOUCH_POOL) {
      const [old, animation] = animations.entries().next().value!;
      animation.cancel(); old.remove(); animations.delete(old);
    }
    layer.append(ring);
    const animation = ring.animate([
      { transform: 'scale(.001)', opacity: .55 },
      { transform: 'scale(.65)', opacity: .32, offset: .65 },
      { transform: 'scale(1)', opacity: 0 },
    ], { duration: TOUCH_TRAVEL_MS, easing: 'linear' });
    animations.set(ring, animation);
    animation.onfinish = () => { ring.remove(); animations.delete(ring); };
    // The fallback follows the wave's travel time, rather than flashing every title simultaneously.
    if (!document.documentElement.classList.contains('vfx-live')) {
      for (const el of document.querySelectorAll<HTMLElement>('[data-vfx="title"]')) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const distance = Math.hypot(Math.max(rect.left-x, 0, x-rect.right), Math.max(rect.top-y, 0, y-rect.bottom));
        const generation = (generations.get(el) ?? 0) + 1;
        generations.set(el, generation);
        later(() => {
          if (generations.get(el) !== generation || document.documentElement.classList.contains('vfx-live')) return;
          el.classList.add('touch-lit'); lit.add(el);
          later(() => { if (generations.get(el) === generation) { el.classList.remove('touch-lit'); lit.delete(el); } }, 1000);
        }, distance / w.reach * TOUCH_TRAVEL_MS);
      }
    }
  };
  listenForTouch(window, start, abort.signal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) field.clear(); }, { signal: abort.signal });
  return () => {
    abort.abort(); field.clear();
    animations.forEach((animation, el) => { animation.cancel(); el.remove(); });
    timers.forEach(clearTimeout); lit.forEach(el => el.classList.remove('touch-lit'));
  };
}
