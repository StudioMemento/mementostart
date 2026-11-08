import { DEFAULT_HUB, readRoute, station } from './core.mjs?v=12.0.0';
import { mountNav, safeHub, KIT_VERSION } from './navbar.mjs?v=12.0.0';

// Overlay adapter only. The existing hub continues to own its scene and iframes.
export function installHost({ hub = DEFAULT_HUB, active, onNavigate, subscribe } = {}) {
  if (window.__MEMENTO_OVERLAY_HOST_V3__) return window.__MEMENTO_OVERLAY_HOST_V3__;
  hub = safeHub(hub);
  const existing = document.querySelector('memento-nav');
  const nav = mountNav({ hub, mode: 'host', active: active || existing?.getAttribute('active') || readRoute(location.href).id });
  const controller = new AbortController();
  const setActive = value => {
    const id = typeof value === 'string' ? value : value?.id || value?.station;
    if (station(id)) nav.setAttribute('active', id);
  };
  const sync = () => setActive(readRoute(location.href).id);
  window.addEventListener('popstate', sync, { signal: controller.signal });
  window.addEventListener('hashchange', sync, { signal: controller.signal });
  window.addEventListener('memento:state', event => setActive(event.detail), { signal: controller.signal });
  if (onNavigate) nav.addEventListener('memento:navigate', event => {
    if (event.defaultPrevented) return;
    event.preventDefault(); onNavigate(event.detail);
  }, { signal: controller.signal });
  const unsubscribe = typeof subscribe === 'function' ? subscribe(setActive) : null;
  const api = { kitVersion: KIT_VERSION, nav, setActive, sync, setHidden: hidden => { nav.hidden = Boolean(hidden); }, destroy() {
    controller.abort(); if (typeof unsubscribe === 'function') unsubscribe(); nav.remove();
    delete window.__MEMENTO_OVERLAY_HOST_V3__;
    if (window.MementoOverlay === api) delete window.MementoOverlay;
  } };
  window.__MEMENTO_OVERLAY_HOST_V3__ = window.MementoOverlay = api;
  return api;
}
