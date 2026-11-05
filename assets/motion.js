(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  function fit(text,width,tracking=0,padding=0,max=260){ctx.font='350 100px Inter';return Math.min(max,Math.max(12,width/(ctx.measureText(text).width/100+(text.length-1)*tracking+padding)));}
  function typography(){
    document.querySelectorAll('.hero-line,.explore-words>span,.fit-heading').forEach(el=>{
      const style=getComputedStyle(el),current=parseFloat(style.fontSize)||100;
      const padding=(parseFloat(style.paddingLeft)+parseFloat(style.paddingRight))/current,tracking=(parseFloat(style.letterSpacing)||0)/current;
      const fitted=fit(el.textContent.trim(),el.clientWidth*.985,tracking,padding);
      el.style.fontSize=fitted+'px';
      // Optical sizing at small sizes can differ from the canvas estimate.
      if(el.scrollWidth>el.clientWidth)el.style.fontSize=(fitted*el.clientWidth*.985/el.scrollWidth)+'px';
    });
  }
  document.fonts.ready.then(()=>{typography();document.dispatchEvent(new Event("memento:typography"));});
  if('ResizeObserver' in window){const widths=new WeakMap();const resize=new ResizeObserver(entries=>{if(entries.some(e=>{const width=e.contentRect.width;if(widths.get(e.target)===width)return false;widths.set(e.target,width);return true;}))typography();});resize.observe(document.querySelector('.hero'));resize.observe(document.querySelector('.explore-section'));}
  else addEventListener('resize',typography,{passive:true});
})();
