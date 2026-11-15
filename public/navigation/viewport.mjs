// Fixed overlay dimensions are established before the content or GPU modules load.
export function syncNavViewport(nav, view = window.visualViewport) {
  const height = Math.round(view && view.scale === 1 ? view.height : window.innerHeight);
  if (height > 0) nav.style.setProperty('--memento-nav-height', height + 'px');
}
export function bindNavViewport(nav) {
  const controller = new AbortController(), signal = controller.signal;
  let frame = 0;
  const sync = () => { frame = 0; syncNavViewport(nav); };
  const queue = () => { if (!frame) frame = requestAnimationFrame(sync); };
  sync();
  window.addEventListener('resize', queue, { passive: true, signal });
  window.addEventListener('pageshow', sync, { passive: true, signal });
  window.visualViewport?.addEventListener('resize', queue, { passive: true, signal });
  return () => { controller.abort(); cancelAnimationFrame(frame); };
}
