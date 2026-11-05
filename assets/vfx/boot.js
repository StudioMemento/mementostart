/* Independent fail-open bootstrap: this code runs before stylesheet paint. */
(()=>{
 const root=document.documentElement;
 const boot=window.__MEMENTO_FX_BOOT__={at:performance.now(),pending:false,expired:false,abort:null};
 const restore=()=>{boot.pending=false;boot.expired=true;root.classList.remove('mm-fx-pending');document.querySelectorAll('[data-mm-mask]').forEach(el=>{el.style.removeProperty('mask-image');el.style.removeProperty('-webkit-mask-image');el.style.removeProperty('pointer-events');});};
 boot.restore=restore;
 if(new URLSearchParams(location.search).get('fx')==='off'||matchMedia('(prefers-reduced-motion: reduce),(forced-colors: active)').matches||location.hash||window.scrollY>0||performance.getEntriesByType('navigation')[0]?.type==='back_forward')return;
 boot.pending=true;
 // Install both recovery timers before making any content invisible.
 boot.preparation=setTimeout(()=>{if(boot.pending)restore();},200);
 boot.deadline=setTimeout(()=>{restore();boot.abort?.();},1400);
 root.classList.add('mm-fx-pending');
 addEventListener('error',restore,{once:true});
 addEventListener('pageshow',e=>{if(e.persisted)restore();});
})();
