import { STATIONS,PUBLIC_ORIGIN,publicRouteURL } from './core.mjs?v=12.1.0';
import { overlayCSS } from './styles.mjs?v=12.1.0';
import { edgeMarkup } from './blur.mjs?v=12.1.0';
import { iconSVG } from './icons.mjs?v=12.1.0';
import { wordmarkMarkup } from './wordmark.mjs?v=12.1.0';

// One renderer shared by build-time HTML and the custom-element fallback.
export function navMarkup(active='memento') {
  return `<style>${overlayCSS}</style>${edgeMarkup('top')}${edgeMarkup('bottom')}
    <a class="mm-wordmark" data-id="memento" data-view="world" href="${PUBLIC_ORIGIN}/" target="_top" aria-label="Memento — torna alla home">${wordmarkMarkup()}</a>
    <nav class="mm-dock" aria-label="Navigazione Memento">${STATIONS.map(item=>`<a class="mm-link" data-id="${item.id}" data-view="page" href="${publicRouteURL({id:item.id,view:'page'})}" target="_top" aria-label="${item.label}"${item.id===active?' aria-current="page"':''}><span class="mm-tile" aria-hidden="true">${iconSVG(item.id)}</span></a>`).join('')}</nav>`;
}
