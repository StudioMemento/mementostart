/* Native scroll rail. No image, scene, or effects over the hub background. */
(() => {
  'use strict';
  const root = document.documentElement;
  const forced = matchMedia('(forced-colors: active)');
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  // A transparent overlay indicator replaces the browser's reserved gutter.
  // Touch/wheel scrolling outside the 12–16 px rail is entirely native.
  const rail = document.createElement('div');
  rail.className = 'memento-scrollbar';
  rail.tabIndex = 0;
  rail.setAttribute('role', 'scrollbar');
  rail.setAttribute('aria-label', 'Scorri la pagina');
  rail.setAttribute('aria-controls', document.querySelector('main')?.id || 'memento-catalogo');
  rail.setAttribute('aria-orientation', 'vertical');
  rail.setAttribute('aria-valuemin', '0');
  rail.setAttribute('aria-valuemax', '100');
  rail.setAttribute('aria-valuenow', '0');
  const thumb = document.createElement('span');
  thumb.className = 'memento-scrollbar-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  rail.append(thumb);
  document.body.append(rail);
  root.dataset.overlayScrollbar = 'true';
  let scrollFrame = 0, scrollTimer = 0, drag = null;
  let range = 0, travel = 0, thumbSize = 32;
  function measureScroll() {
    scrollFrame = 0;
    const viewport = window.innerHeight;
    const height = Math.max(root.scrollHeight, document.body.scrollHeight);
    range = Math.max(0, height - viewport);
    const trackHeight = Math.max(0, viewport - 8);
    thumbSize = clamp(trackHeight * viewport / Math.max(viewport, height), 32, trackHeight);
    travel = Math.max(0, trackHeight - thumbSize);
    rail.hidden = range <= 1 || forced.matches || !!document.querySelector('dialog[open]');
    const progress = range > 0 ? clamp(window.scrollY / range, 0, 1) : 0;
    rail.style.setProperty('--scroll-size', `${thumbSize.toFixed(2)}px`);
    rail.style.setProperty('--scroll-top', `${(progress * travel).toFixed(2)}px`);
    rail.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(measureScroll);
  }
  function scrolling() {
    scheduleScroll();
    rail.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => rail.classList.remove('is-scrolling'), 800);
  }
  function jump(top) {
    window.scrollTo({top: clamp(top, 0, range), behavior: 'instant'});
    measureScroll();
  }
  function endDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (rail.hasPointerCapture?.(id)) rail.releasePointerCapture(id);
    rail.classList.remove('is-dragging');
  }
  rail.addEventListener('pointerdown', event => {
    if (event.button !== 0 || rail.hidden) return;
    measureScroll();
    const trackTop = rail.getBoundingClientRect().top;
    const thumbTop = range ? clamp(window.scrollY / range, 0, 1) * travel : 0;
    const local = event.clientY - trackTop;
    const inside = local >= thumbTop && local <= thumbTop + thumbSize;
    drag = {id: event.pointerId, offset: inside ? local - thumbTop : thumbSize / 2, top: trackTop};
    rail.setPointerCapture?.(event.pointerId);
    rail.classList.add('is-dragging');
    if (!inside && travel) jump((local - drag.offset) / travel * range);
    event.preventDefault();
  });
  rail.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id || !travel) return;
    jump((event.clientY - drag.top - drag.offset) / travel * range);
    event.preventDefault();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => rail.addEventListener(type, endDrag));
  window.addEventListener('blur', endDrag);
  rail.addEventListener('keydown', event => {
    measureScroll();
    const top = window.scrollY;
    const next = {ArrowUp: top - 48, ArrowDown: top + 48, PageUp: top - innerHeight * .85, PageDown: top + innerHeight * .85, Home: 0, End: range}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    jump(next);
  });
  window.addEventListener('scroll', scrolling, {passive: true});
  window.addEventListener('resize', scheduleScroll, {passive: true});
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(scheduleScroll);
    resize.observe(document.body);
    const main = document.querySelector('main');
    if (main) resize.observe(main);
  }
  forced.addEventListener?.('change', scheduleScroll);
  window.visualViewport?.addEventListener('resize', scheduleScroll, {passive: true});
  document.addEventListener('memento:overlay-change', () => {
    endDrag(); measureScroll();
  });
  measureScroll();
})();
