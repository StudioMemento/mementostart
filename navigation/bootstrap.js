/* Memento overlay V5. Plain browser modules; no framework, build or CDN. */
(() => {
  const script = document.currentScript;
  if (!script) return;
  const options = { page: script.dataset.mementoPage, hub: script.dataset.mementoHub || 'https://mementostudio.it' };
  const host = script.dataset.mementoRole === 'host';
  const ready = () => import(new URL(host ? './host.mjs' : './child.mjs', script.src).href)
    .then(module => host ? module.installHost(options) : module.installChild(options))
    .catch(error => console.error('Memento: caricamento overlay non riuscito.', error));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
})();
