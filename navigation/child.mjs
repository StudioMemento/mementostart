import { CHANNEL, VERSION, DEFAULT_HUB, STATIONS, station, trustedParent, navigationLink, sessionEnvelope, validMessage, publicRouteURL } from './core.mjs?v=12.0.0';
import { mountNav, safeHub, KIT_VERSION } from './navbar.mjs?v=12.0.0';

export function installChild({ page, hub = DEFAULT_HUB } = {}) {
  if (window.__MEMENTO_NAV_V3__) return window.__MEMENTO_NAV_V3__;
  if (window.__MEMENTO_NAV_V2__) {
    console.warn('Memento: sostituire il bootstrap V2, senza caricare contemporaneamente due bridge.');
    return window.__MEMENTO_NAV_V2__;
  }
  hub = safeHub(hub);
  const id = station(page)?.id || STATIONS.find(s => new URL(s.url).origin === location.origin)?.id || 'memento';
  const embedded = parent !== window;
  const nav = mountNav({ active: id, hub, hidden: embedded });
  let connection = null, active = !embedded, lastWheel = 0, debt = 0, lastSign = 0, touch = null, readyAt = 0;
  const controller = new AbortController(), signal = controller.signal;
  const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler, { ...options, signal });
  const style = document.createElement('style');
  style.dataset.mementoNav = 'v3';
  style.textContent = `html[data-memento-navigation=standalone]{--memento-safe-top:max(76px,calc(env(safe-area-inset-top,0px) + 60px));--memento-safe-bottom:max(96px,calc(env(safe-area-inset-bottom,0px) + 80px));scroll-padding-top:var(--memento-safe-top);scroll-padding-bottom:var(--memento-safe-bottom)}html[data-memento-navigation=standalone] [data-memento-content-insets]{padding-top:var(--memento-safe-top);padding-bottom:var(--memento-safe-bottom)}html[data-memento-navigation=hosted] memento-nav{display:none!important}`;
  document.head.append(style);
  document.documentElement.dataset.mementoPage = id;
  const setMode = hosted => {
    nav.hidden = hosted;
    nav.setAttribute('mode', hosted ? 'hosted' : 'standalone');
    // A direct embed without a compatible host must not open the hub inside itself.
    if (embedded && !hosted) nav.setAttribute('target', '_top'); else nav.removeAttribute('target');
    document.documentElement.dataset.mementoNavigation = hosted ? 'hosted' : 'standalone';
  };
  const send = (type, payload = {}) => { if (connection) parent.postMessage(sessionEnvelope(id, connection.sessionId, type, payload), connection.origin); };
  const modal = () => [...document.querySelectorAll('dialog[open],[aria-modal="true"]:not([hidden]):not([aria-hidden="true"])')].some(el => el.getClientRects().length > 0);
  const editing = el => el?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])');
  const busyTarget = el => el?.closest?.('iframe,video,audio,[role=slider],input[type=range],canvas,[data-memento-gesture-lock]');
  const scrollingRoot = () => {
    const root = document.scrollingElement;
    if (root && root.scrollHeight > root.clientHeight + 4) return root;
    return [...document.querySelectorAll('#catalogue-viewport,main,[data-scroll-root]')].find(el => el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) || root;
  };
  function canConsume(target, delta) {
    const root = scrollingRoot();
    for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
      if (el === root) return delta < 0 ? el.scrollTop > 2 : el.scrollTop + el.clientHeight < el.scrollHeight - 3;
      if (el.scrollHeight > el.clientHeight + 3 && /(auto|scroll)/.test(getComputedStyle(el).overflowY) &&
        (delta < 0 ? el.scrollTop > 2 : el.scrollTop + el.clientHeight < el.scrollHeight - 3)) return true;
    }
    return root && (delta < 0 ? root.scrollTop > 2 : root.scrollTop + root.clientHeight < root.scrollHeight - 3);
  }
  function visible(value) {
    active = value; window.__TIDE_VISIBLE__ = value; readyAt = performance.now(); debt = 0; lastWheel = 0; touch = null;
    document.documentElement.dataset.mementoActive = String(value);
    document.dispatchEvent(new Event('memento:overlay-change'));
    if (!value) document.querySelectorAll('video,audio').forEach(el => el.pause());
  }
  function returnIntent(edge) { if (active) { active = false; send('RETURN', { edge }); } }
  listen(window, 'message', event => {
    const d = event.data;
    if (event.source !== parent || !embedded || !trustedParent(event.origin, hub) || d?.channel !== CHANNEL || d.version !== VERSION || d.station !== id) return;
    if (d.type === 'INIT' && typeof d.sessionId === 'string' && d.sessionId.length >= 12 && d.sessionId.length <= 160 && d.payload && typeof d.payload === 'object' && !Array.isArray(d.payload)) {
      const fresh = connection?.sessionId !== d.sessionId;
      connection = { id, origin: event.origin, source: parent, sessionId: d.sessionId };
      setMode(true);
      if (fresh) visible(false);
      send('READY', { bridge: 'memento-nav-v3', kitVersion: KIT_VERSION, supportsNavigation: true, supportsBoundary: true });
      return;
    }
    if (!validMessage(event, connection)) return;
    if (d.type === 'VISIBILITY') visible(d.payload.active === true);
    if (d.type === 'FOCUS') {
      const target = document.querySelector('main,h1');
      if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
  });
  listen(nav, 'memento:navigate', event => {
    if (!connection) return;
    event.preventDefault();
    if (event.detail.view === 'world') returnIntent('explicit');
    else send('NAVIGATE', { id: event.detail.id, view: 'page' });
  });
  listen(document, 'click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = navigationLink(link.href, location.href, hub);
    if (!target) return;
    if (!connection) { link.href = publicRouteURL(target); if (embedded) link.target = '_top'; return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (target.view === 'world') returnIntent('explicit'); else send('NAVIGATE', target);
  }, { capture: true });
  listen(window, 'keydown', event => {
    if (!connection || !active || event.defaultPrevented || editing(event.target) || modal()) return;
    if (event.key === 'Escape') { event.preventDefault(); returnIntent('explicit'); }
    if (event.key === 'PageUp' && !canConsume(event.target, -1) && !busyTarget(event.target)) { event.preventDefault(); returnIntent('start'); }
  });
  listen(window, 'wheel', event => {
    if (!connection || !active || event.defaultPrevented || performance.now() - readyAt < 900 || event.ctrlKey || modal() || editing(event.target) || busyTarget(event.target)) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1), sign = Math.sign(delta), now = performance.now();
    const fresh = now - lastWheel > 220 || sign !== lastSign;
    if (fresh) debt = 0;
    lastWheel = now; lastSign = sign;
    if (canConsume(event.target, delta)) { debt = 0; return; }
    if (fresh) debt = Math.abs(delta); else if (debt) debt += Math.abs(delta);
    if (debt >= 180) { event.preventDefault(); returnIntent(delta < 0 ? 'start' : 'end'); }
  }, { passive: false });
  listen(window, 'touchstart', event => {
    const p = event.touches[0];
    touch = event.touches.length === 1 && connection && active && performance.now() - readyAt >= 900 && !modal() && !editing(event.target) && !busyTarget(event.target)
      ? { x: p.clientX, y: p.clientY, target: event.target, start: !canConsume(event.target, -1), end: !canConsume(event.target, 1) } : null;
  }, { passive: true });
  listen(window, 'touchend', event => {
    const p = event.changedTouches[0], t = touch; touch = null;
    if (!t || !p) return;
    const dy = t.y - p.clientY, dx = Math.abs(t.x - p.clientX);
    if (Math.abs(dy) > 90 && Math.abs(dy) > dx * 1.4 && ((dy < 0 && t.start) || (dy > 0 && t.end))) returnIntent(dy < 0 ? 'start' : 'end');
  }, { passive: true });
  listen(window, 'touchcancel', () => { touch = null; }, { passive: true });
  let fallback;
  if (!embedded) setMode(false); else fallback = setTimeout(() => { if (!connection) setMode(false); }, 1200);
  const api = { version: VERSION, kitVersion: KIT_VERSION, page: id, nav, get connected() { return Boolean(connection); }, destroy() {
    controller.abort(); clearTimeout(fallback); style.remove(); nav.remove();
    delete document.documentElement.dataset.mementoPage; delete document.documentElement.dataset.mementoNavigation; delete document.documentElement.dataset.mementoActive;
    delete window.__MEMENTO_NAV_V2__; delete window.__MEMENTO_NAV_V3__;
  } };
  // Retain the original public marker for existing integrations.
  window.__MEMENTO_NAV_V2__ = window.__MEMENTO_NAV_V3__ = api;
  return api;
}
