import { STATIONS, DEFAULT_HUB, station, routePath } from './core.mjs';
import { iconSVG } from './icons.mjs';
import { overlayCSS, legacyHostLayoutCSS } from './styles.mjs';

export const KIT_VERSION = '4.0.0';
const wordmark = new URL('./assets/memento-wordmark.svg', import.meta.url).href;
const veil = edge => `<div class="veil veil--${edge}" aria-hidden="true"><div class="blur"></div></div>`;
export function safeHub(input = DEFAULT_HUB) {
  try { const url = new URL(input); if (!['http:', 'https:'].includes(url.protocol)) throw Error(); return url.origin; }
  catch { return DEFAULT_HUB; }
}

export class MementoNav extends HTMLElement {
  static kitVersion = KIT_VERSION;
  static observedAttributes = ['active', 'hub', 'mode', 'target'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${overlayCSS}</style>${veil('top')}${veil('bottom')}<a class="wordmark" data-id="memento" data-view="world" aria-label="Memento — torna alla navigazione"><img src="${wordmark}" width="1417.32" height="28.35" alt="Memento" draggable="false" /></a><nav aria-label="Navigazione Memento">${STATIONS.map(s => `<a class="station" data-id="${s.id}" data-view="page" aria-label="${s.label}">${iconSVG(s.id)}<span class="label" aria-hidden="true">${s.label}</span></a>`).join('')}</nav>`;
    this.shadowRoot.addEventListener('click', event => {
      const link = event.target.closest?.('a[data-id]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const intent = new CustomEvent('memento:navigate', {
        bubbles: true, composed: true, cancelable: true,
        detail: { id: link.dataset.id, view: link.dataset.view }
      });
      // The host must preventDefault only when it actually handles the route.
      if (!this.dispatchEvent(intent)) event.preventDefault();
    });
    this.shadowRoot.addEventListener('keydown', event => {
      const links = [...this.shadowRoot.querySelectorAll('.station')];
      const current = links.indexOf(event.target.closest?.('.station'));
      if (current < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
      let next;
      if (event.key === 'ArrowRight') next = (current + 1) % links.length;
      if (event.key === 'ArrowLeft') next = (current + links.length - 1) % links.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = links.length - 1;
      if (next !== undefined) { event.preventDefault(); links[next].focus(); }
    });
  }
  connectedCallback() { this.update(); }
  attributeChangedCallback(name, before, after) { if (before !== after) this.update(); }
  update() {
    if (!this.shadowRoot) return;
    const active = station(this.getAttribute('active'))?.id || 'memento';
    const hub = safeHub(this.getAttribute('hub') || DEFAULT_HUB);
    for (const link of this.shadowRoot.querySelectorAll('a[data-id]')) {
      link.href = new URL(routePath({ id: link.dataset.id, view: link.dataset.view }), hub).href;
      const target = this.getAttribute('target');
      if (['_self', '_top', '_blank'].includes(target)) link.target = target; else link.removeAttribute('target');
      if (target === '_blank') link.rel = 'noopener'; else link.removeAttribute('rel');
      if (link.classList.contains('station') && link.dataset.id === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
  setActive(id) { if (station(id)) this.setAttribute('active', id); }
}

if (!customElements.get('memento-nav')) customElements.define('memento-nav', MementoNav);
else if (customElements.get('memento-nav').kitVersion !== KIT_VERSION) console.warn('Memento: rimuovere la vecchia navbar prima di caricare il kit V4.');

// Same signature as V2: existing hub imports remain valid.
export function mountNav({ active = 'memento', hub = DEFAULT_HUB, mode = 'standalone', hidden = false } = {}) {
  const world = document.getElementById('world'), shell = document.getElementById('page-shell'), wrap = document.getElementById('page-frame-wrap');
  if (world?.querySelector('#canvas') && shell && wrap && shell.contains(wrap)) {
    document.documentElement.dataset.mementoOverlayHost = 'v3';
    if (!document.getElementById('memento-v3-host-layout')) {
      const style = document.createElement('style'); style.id = 'memento-v3-host-layout';
      style.textContent = legacyHostLayoutCSS; document.head.append(style);
    }
  }
  let nav = document.querySelector('memento-nav');
  if (!nav) { nav = document.createElement('memento-nav'); document.body.append(nav); }
  nav.setAttribute('hub', safeHub(hub));
  nav.setAttribute('active', station(active)?.id || 'memento');
  nav.setAttribute('mode', mode);
  nav.hidden = hidden;
  return nav;
}
