import { listenForTouch, touchArrival, TouchPulseField } from './touch';

/** Invisible timing field. Plain-DOM fallback briefly warms titles; no extra painted layer. */
export function installTouchFeedback(field: TouchPulseField) {
  const abort = new AbortController(), timers = new Set<number>(), lit = new Set<HTMLElement>();
  const generations = new WeakMap<HTMLElement, number>();
  const later = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id);
  };
  const reset = () => { field.clear(); timers.forEach(clearTimeout); timers.clear(); lit.forEach(el => el.classList.remove('touch-lit')); lit.clear(); };
  listenForTouch(window, (x, y) => {
    if (document.hidden || (window as { __TIDE_VISIBLE__?: boolean }).__TIDE_VISIBLE__ === false || matchMedia('(forced-colors: active), (prefers-reduced-motion: reduce)').matches) return;
    const now = performance.now();
    const w = field.start(x, y, document.documentElement.clientWidth, innerHeight, now);
    if (document.documentElement.classList.contains('vfx-live')) return;
    // Bounded fallback: no active render loop and no timer accumulation under repeated touches.
    timers.forEach(clearTimeout); timers.clear(); lit.forEach(el => el.classList.remove('touch-lit')); lit.clear();
    for (const el of document.querySelectorAll<HTMLElement>('[data-vfx="title"]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const generation = (generations.get(el) ?? 0) + 1; generations.set(el, generation);
      later(() => {
        if (generations.get(el) !== generation || document.documentElement.classList.contains('vfx-live')) return;
        el.classList.add('touch-lit'); lit.add(el);
        later(() => { if (generations.get(el) === generation) { el.classList.remove('touch-lit'); lit.delete(el); } }, 340);
      }, touchArrival(w, r.left + r.width * .5, r.top + r.height * .5, r.left) - now);
    }
  }, abort.signal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); }, { signal: abort.signal });
  return () => { abort.abort(); reset(); };
}
