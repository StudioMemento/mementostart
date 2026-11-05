(function(scope){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const hash=n=>{let x=(n|0)+0x6D2B79F5;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
 function field(y,H,s,sMax,cfg){
  if(H<=0)return 1;
  s=clamp(s,0,Math.max(0,sMax));
  const top=smooth(0,cfg.rootGate*H,s),bottom=smooth(0,cfg.rootGate*H,sMax-s),u=y/H;
  return (1-top+top*smooth(...cfg.top,u))*(1-bottom*smooth(...cfg.bottom,u));
 }
 const phase=(p,h)=>({fill:smooth(.32+.16*h,.48+.16*h,p),wire:smooth(.16,.30,p)*(1-smooth(.38,.58,p)),trail:smooth(0,.065,p)*(1-smooth(.16,.27,p))});
 function mesh(w,h,size,seed=1,band=0){
  const cols=Math.ceil(w/size),rows=Math.ceil(h/size),dx=w/cols,dy=h/rows,points=[],cells=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const id=j*(cols+1)+i;
   points.push([i*dx+(i&&i<cols?(hash(id*3+seed)-.5)*dx*.58:0),j*dy+(j&&j<rows?(hash(id*3+seed+1)-.5)*dy*.58:0)]);
  }
  const add=(a,b,c)=>{if(band&&[a,b,c].every(p=>p[0]>band&&p[0]<w-band&&p[1]>band&&p[1]<h-band))return;const v=[a,b,c],x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3,id=cells.length;
   cells.push({x,y,h:hash(id*13+seed),points:v,path:'M'+v.map(p=>p.map(n=>+n.toFixed(2)).join(' ')).join('L')+'Z'});};
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const a=points[j*(cols+1)+i],b=points[j*(cols+1)+i+1],c=points[(j+1)*(cols+1)+i],d=points[(j+1)*(cols+1)+i+1];
   if(hash(j*cols+i+seed)>.5){add(a,b,c);add(b,d,c);}else{add(a,b,d);add(a,d,c);}
  }
  return cells;
 }
 scope.MementoFXMath={clamp,smooth,hash,field,phase,mesh};
})(typeof window==='undefined'?globalThis:window);
