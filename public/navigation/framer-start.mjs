/** Parent-side fix for /start. A child iframe cannot measure its parent's browser toolbar. */
export function bindStartEmbed(frame, view = window.visualViewport) {
  const doc = frame.ownerDocument, win = doc.defaultView;
  const root = doc.documentElement, abort = new AbortController(), signal = abort.signal;
  const marked = [];
  for (let el = frame.parentElement; el && el !== doc.body; el = el.parentElement) {
    el.setAttribute('data-mm-start-ancestor', ''); marked.push(el);
  }
  frame.setAttribute('data-mm-start-frame', '');
  root.setAttribute('data-mm-start-host', '');
  const style = doc.createElement('style');
  style.textContent = `
    html[data-mm-start-host],html[data-mm-start-host] body {
      margin:0!important;padding:0!important;width:100%!important;
      height:var(--mm-start-visible-height,100dvh)!important;min-height:0!important;
      overflow:hidden!important;overscroll-behavior:none;
    }
    [data-mm-start-ancestor] {
      height:var(--mm-start-visible-height,100dvh)!important;min-height:0!important;
      max-height:var(--mm-start-visible-height,100dvh)!important;overflow:clip!important;
    }
    iframe[data-mm-start-frame] {
      position:fixed!important;inset:0 auto auto 0!important;display:block!important;
      width:100%!important;height:var(--mm-start-visible-height,100dvh)!important;border:0!important;
    }
  `;
  doc.head.append(style);
  const previous = root.style.getPropertyValue('--mm-start-visible-height');
  const oldLoading = frame.getAttribute('loading'); frame.loading = 'eager';
  const sync = () => {
    const height = Math.round(view && view.scale === 1 ? view.height : win.innerHeight);
    if (height > 0 && root.style.getPropertyValue('--mm-start-visible-height') !== height + 'px') root.style.setProperty('--mm-start-visible-height', height + 'px');
  };
  sync(); win.scrollTo(0, 0);
  win.addEventListener('resize', sync, { passive: true, signal });
  win.addEventListener('pageshow', sync, { passive: true, signal });
  view?.addEventListener('resize', sync, { passive: true, signal });
  // No touch/wheel interception: the iframe remains the single native scrolling document.
  return () => {
    abort.abort(); style.remove();
    marked.forEach(el => el.removeAttribute('data-mm-start-ancestor'));
    frame.removeAttribute('data-mm-start-frame'); root.removeAttribute('data-mm-start-host');
    if (previous) root.style.setProperty('--mm-start-visible-height', previous); else root.style.removeProperty('--mm-start-visible-height');
    if (oldLoading === null) frame.removeAttribute('loading'); else frame.setAttribute('loading', oldLoading);
  };
}

export function installStartEmbed() {
  let frame = null, release = null;
  const sync = () => {
    const next = /^\/start\/?$/.test(location.pathname)
      ? [...document.querySelectorAll('iframe[src]')].find(el => {
        try { return new URL(el.src).origin === 'https://mementostart.vercel.app'; } catch { return false; }
      }) : null;
    if (next === frame) return;
    release?.(); frame = next; release = next ? bindStartEmbed(next) : null;
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', sync);
  sync();
  return () => { observer.disconnect(); window.removeEventListener('popstate', sync); release?.(); };
}

// Include this module in Framer's PAGE custom code, not inside the embedded Vercel document.
if (typeof window !== 'undefined' && /^\/start\/?$/.test(location.pathname)) installStartEmbed();
