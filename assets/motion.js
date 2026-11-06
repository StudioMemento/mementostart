(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement, cards=[...document.querySelectorAll('.reveal')];
  let observer;
  function setupReveal(){
    observer?.disconnect();
    if(reduced.matches||!('IntersectionObserver' in window)){root.classList.remove('motion-ready');cards.forEach(el=>el.classList.add('is-visible'));return;}
    root.classList.add('motion-ready');
    document.querySelectorAll('.channels .reveal').forEach((el,i)=>el.style.setProperty('--reveal-delay',`${i*80}ms`));
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08,rootMargin:'0px 0px -18px 0px'});
    cards.forEach(el=>observer.observe(el));
  }
  setupReveal();reduced.addEventListener('change',setupReveal);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function fit(text,width,tracking=0,padding=0,max=260){ctx.font='350 100px Inter';return Math.min(max,Math.max(12,width/(ctx.measureText(text).width/100+(text.length-1)*tracking+padding)));}
  function typography(){
    document.querySelectorAll('.hero-line,.explore-line,.fit-heading').forEach(el=>{
      const style=getComputedStyle(el),current=parseFloat(style.fontSize)||100;
      const padding=(parseFloat(style.paddingLeft)+parseFloat(style.paddingRight))/current,tracking=(parseFloat(style.letterSpacing)||0)/current;
      const fitted=fit(el.textContent.trim(),el.clientWidth*.985,tracking,padding);
      el.style.fontSize=fitted+'px';
      // Optical sizing at small sizes can differ from the canvas estimate.
      if(el.scrollWidth>el.clientWidth)el.style.fontSize=(fitted*el.clientWidth*.985/el.scrollWidth)+'px';
    });
  }
  document.fonts.ready.then(typography);
  if('ResizeObserver' in window){const widths=new WeakMap();const resize=new ResizeObserver(entries=>{if(entries.some(e=>{const width=e.contentRect.width;if(widths.get(e.target)===width)return false;widths.set(e.target,width);return true;}))typography();});resize.observe(document.querySelector('.hero'));resize.observe(document.querySelector('.explore-section'));}
  else addEventListener('resize',typography,{passive:true});
})();
