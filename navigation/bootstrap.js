/* Memento clean overlay 12.0.0 — load once, before </body>. */
(()=>{
  const script=document.currentScript;if(!script)return;
  const options={page:script.dataset.mementoPage,hub:script.dataset.mementoHub||'https://mementostudio.it'};
  const host=script.dataset.mementoRole==='host';
  const start=()=>import(new URL(host?'./host.mjs?v=12.0.0':'./child.mjs?v=12.0.0',script.src).href)
    .then(module=>host?module.installHost(options):module.installChild(options))
    .catch(error=>console.error('Memento V12: '+error.message));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
