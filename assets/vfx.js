/* Memento START / V12 edge fragments. Two decorative render layers, one engine and one clock.
   Canvas2D is deliberate: no extra WebGL context, library or DOM rasterization.
   Real DOM content is revealed with cached SVG alpha masks. */
(() => {
  'use strict';
  const M=globalThis.MementoVFXMath,root=document.documentElement;
  if(!M){root.classList.remove('vfx-boot');return;}
  window.MementoStartVFX?.dispose();
  const CONFIG=Object.freeze({radius:370,touchRadius:220,dpr:1.5,mobileDpr:1.25,pool:112,mobilePool:44,loadSeconds:.85,release:.48,attack:.12,headingGain:.65,centerGain:.70});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const ns='http://www.w3.org/2000/svg',listeners=[],targets=[],glyphs=[],icons=[],pulses=[],particles=Array.from({length:CONFIG.pool},()=>({life:0}));
  let bg,fg,bctx,fctx,defsSvg,defs,bgMesh,raf=0,disposed=false,enabled=true,initialized=false,dirty=true,width=innerWidth,height=innerHeight,dpr=1,last=0,start=0,scrollY=window.scrollY,previousScroll=scrollY,layoutWidth=0,bgHeight=0;
  let intro=false,activeCard=null,focusCard=null,particleCredit=0,quality=1,slowFrames=0,fastFrames=0,lastPointerEmission=0;
  let scrollEnergy=0,lastActivity=0,baseCanvas,baseCtx;
  let lastRevealScroll=NaN,lastRevealLayout=-1,lastRevealTime=0;
  const pointer={x:-10000,y:-10000,clientY:-10000,strength:0,wanted:0,type:'mouse',id:null,vx:0,vy:0,moved:0,lastAt:0};
  const metrics={frames:0,samples:[],intervals:[],pointerUps:0,pointerCancels:0,impulses:0,layoutBuilds:0,quality:1,startedAt:0,error:null};
  const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
  const attr=(el,key,value)=>el.setAttribute(key,String(value));
  const svgEl=(name,attributes={})=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attributes))attr(e,k,v);return e;};
  const drawPoly=(ctx,poly)=>{ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();};
  const readRect=el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top+window.scrollY,w:r.width,h:r.height};};
  const rectDistance=(r,x,y)=>Math.hypot(Math.max(r.x-x,0,x-r.x-r.w),Math.max(r.y-y,0,y-r.y-r.h));
  function css(el,key,value){if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);}
  function removeMask(t){t.el.style.removeProperty('mask-image');t.el.style.removeProperty('-webkit-mask-image');t.masked=false;}
  const textureCache=new Map();
  function makeTexture(seed,cell=5,w=144,h=48){
    cell=Math.max(4,Math.round(cell/2)*2);const key=`${cell}:${w}:${h}`;if(textureCache.has(key))return textureCache.get(key);
    const rng=M.random(M.hash(key)),pts=[];
    for(let y=-cell;y<h+cell;y+=cell)for(let x=-cell;x<w+cell;x+=cell)pts.push([x+rng()*cell*.8,y+rng()*cell*.8]);
    const triangles=M.triangulate(pts);
    const body=triangles.map(t=>`<path d="M${t.map(i=>pts[i].map(n=>n.toFixed(2)).join(',')).join('L')}Z" fill="${['#ffbe52','#ef7d0e','#ffd58b','#a54608'][Math.floor(rng()*4)]}" fill-opacity="${(.24+rng()*.28).toFixed(2)}" stroke="#ffc784" stroke-width=".45" stroke-opacity=".50"/>`).join('');
    const texture=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${ns}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}")`;textureCache.set(key,texture);return texture;
  }
  const colorLayers=[];
  function registerImages(){
    for(const original of document.querySelectorAll('main .cut-frame img:not(.vfx-color-pass)')){
      const card=original.closest('.cut-frame');if(card.classList.contains('location-map'))continue;
      const clone=original.cloneNode(false);clone.removeAttribute('id');clone.alt='';clone.setAttribute('aria-hidden','true');clone.classList.add('vfx-color-pass');original.after(clone);
      colorLayers.push({original,clone,card,offsetX:0,offsetY:0});
    }
  }
  function updateImages(){
    for(const layer of colorLayers){const {original,clone,card,offsetX,offsetY}=layer;
      if(clone.getAttribute('src')!==original.getAttribute('src'))clone.src=original.getAttribute('src');
      const t=targets.find(t=>t.el===card);if(!t?.visible)continue;
      const active=t===activeCard||t===focusCard;
      css(clone,'--vfx-color-on',active?'1':'0');
      css(clone,'--vfx-local-x',(pointer.x-t.r.x-offsetX).toFixed(1)+'px');css(clone,'--vfx-local-y',(pointer.y-t.r.y-offsetY).toFixed(1)+'px');
      css(card,'--vfx-color-radius',(pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius)+'px');
    }
  }
  function register(){
    const cards=[...document.querySelectorAll('main .cut-frame')];
    const headers=[...document.querySelectorAll('.hero-line,.fit-heading,.explore-line')];
    [...cards,...headers].forEach((el,i)=>{
      const kind=cards.includes(el)?'card':'heading',id=el.id||`surface-${M.hash(el.className+'-'+i).toString(16)}`,seed=M.hash(id);
      const t={el,id,seed,kind,map:el.classList.contains('location-map'),legal:el.classList.contains('legal-card'),r:null,mesh:null,reveal:null,mask:null,maskNodes:[],masked:false,full:true,cells:[],protection:[],visible:false};
      el.dataset.vfxSurface=id;el.classList.add('vfx-reveal');targets.push(t);
    });
    document.querySelectorAll('.contact-title,.hero-line,.fit-heading,.explore-line,.faq-title>span').forEach((el,i)=>{
      const heading=el.matches('.hero-line,.fit-heading,.explore-line,.faq-title>span');
      const g={el,heading,id:`glyph-${i}`,seed:M.hash('glyph-'+i),r:null,energy:0,armed:true,waveAt:-10,origin:0,parent:targets.find(t=>t.el===el||t.el.contains(el))};
      el.classList.add('vfx-glyph');el.setAttribute('data-vfx-text',el.textContent);glyphs.push(g);
    });
    document.querySelectorAll('.contact-copy>.icon,.location-card>.icon').forEach((el,i)=>{
      el.classList.add('vfx-icon');css(el,'--vfx-icon-texture',makeTexture(M.hash('icon-'+i),3.4,32,32));
      icons.push({el,r:null,energy:0,parent:targets.find(t=>t.el.contains(el))});
    });
  }
  function fit(){
    const box=bg.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,width<700?CONFIG.mobileDpr:CONFIG.dpr)*quality;
    for(const c of [bg,fg]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    bctx.setTransform(bg.width/width,0,0,bg.height/height,0,0);fctx.setTransform(fg.width/width,0,0,fg.height/height,0,0);
  }
  function measure(){
    dirty=false;fit();metrics.layoutBuilds++;
    // All layout reads precede mask/texture writes.
    const records=targets.map(t=>({t,r:readRect(t.el),cut:parseFloat(getComputedStyle(t.el).getPropertyValue('--cut'))||16,protection:[...t.el.querySelectorAll('.contact-title,.contact-copy>.icon,.location-card>.icon,.location-address,.hours,.faq-item summary,.faq-answer p,.faq-title,.legal-layout,.board-title')].map(readRect)}));
    const glyphRecords=glyphs.map(g=>({g,r:readRect(g.el),font:parseFloat(getComputedStyle(g.el).fontSize)}));
    for(const layer of colorLayers){const r=readRect(layer.original),c=readRect(layer.card);layer.offsetX=r.x-c.x;layer.offsetY=r.y-c.y;}
    const iconRecords=icons.map(i=>({i,r:readRect(i.el)}));
    // The environment is a viewport surface. Scroll never changes its topology or origin.
    if(layoutWidth!==width||bgHeight!==height||!bgMesh){bgHeight=height;layoutWidth=width;bgMesh=M.sampleMesh(width,height,761204,'background');pulses.length=0;}
    for(const {t,r,cut,protection} of records){
      const changed=!t.r||Math.abs(t.r.w-r.w)>.5||Math.abs(t.r.h-r.h)>.5;
      t.r=r;t.protection=protection.map(p=>({x:p.x-r.x-3,y:p.y-r.y-3,w:p.w+6,h:p.h+6}));
      if(!changed){prepareGains(t);continue;}
      t.poly=M.polygon(r.w,r.h,t.kind==='card'?cut:0,t.map);t.cut=cut;
      t.mesh=t.kind==='card'&&!t.map?M.sampleMesh(r.w,r.h,t.seed,'card',cut):null;
      prepareGains(t);
      t.reveal=M.sampleMesh(r.w,r.h,t.seed^0x7771,'reveal',t.kind==='card'?cut:0,t.map);
      t.cells=M.prepareFragments(t.reveal,t.seed);
      if(t.mask)t.mask.remove();
      t.mask=svgEl('mask',{id:`vfx-mask-${t.id}`,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width:r.w,height:r.h,'mask-type':'alpha'});
      // One union path avoids antialias seams between adjacent cells.
      t.maskPath=svgEl('path',{fill:'white',stroke:'white','stroke-width':'.35','stroke-linejoin':'round'});t.mask.append(t.maskPath);t.lastMaskPath='';defs.append(t.mask);
      t.masked=false;t.full=false;
    }
    for(const {g,r,font}of glyphRecords){
      g.r=r;if(g.el.getAttribute('data-vfx-text')!==g.el.textContent)g.el.setAttribute('data-vfx-text',g.el.textContent);
      if(g.font!==font){g.font=font;css(g.el,'--vfx-texture-size','288px 96px');css(g.el,'--vfx-texture',makeTexture(g.seed,Math.max(12,Math.min(26,font*.18)),288,96));}
    }
    for(const {i,r}of iconRecords)i.r=r;
    // Resize never restarts intro. Rebuild masks immediately at the current scroll position.
    cacheBackground();updateReveals(performance.now()/1000);
  }
  function prepareGains(t){
    if(!t.mesh)return;
    const gain=(x,y)=>{let v=1;for(const r of t.protection){const d=Math.hypot(Math.max(r.x-x,0,x-r.x-r.w),Math.max(r.y-y,0,y-r.y-r.h));v=Math.min(v,.24+.76*M.smooth(0,28,d));}return v;};
    t.mesh.edgeGains=Float32Array.from(t.mesh.edges,([a,b])=>gain((t.mesh.points[a][0]+t.mesh.points[b][0])/2,(t.mesh.points[a][1]+t.mesh.points[b][1])/2));
    t.mesh.faceGains=Float32Array.from(t.mesh.triangles,tri=>gain(tri.reduce((n,i)=>n+t.mesh.points[i][0],0)/3,tri.reduce((n,i)=>n+t.mesh.points[i][1],0)/3));
  }
  function focused(t){const active=document.activeElement;return active&&active!==document.body&&(t.el.contains(active)||active.contains(t.el));}
  function updateReveals(now){
    const load=!intro?1:M.clamp((now-start)/CONFIG.loadSeconds),settled=load>=1;
    if(settled&&lastRevealScroll===scrollY&&lastRevealLayout===metrics.layoutBuilds&&lastRevealTime-start>CONFIG.loadSeconds)return;
    lastRevealScroll=scrollY;lastRevealLayout=metrics.layoutBuilds;lastRevealTime=now;
    const bounds=M.revealBounds(height,scrollY);
    for(const t of targets){
      if(!t.r)continue;const y=t.r.y-scrollY;
      t.visible=y+t.r.h>-70&&y<height+70;
      if(!t.visible)continue;
      if(t.legal||focused(t)||(settled&&y>bounds.top+100&&y+t.r.h<bounds.bottom-100)){
        if(t.masked)removeMask(t);t.full=true;t.frontier=0;continue;
      }
      const result=M.fragmentMask(t.cells,t.r.w,t.r.h,t.r.x,y,height,scrollY,t.seed,load);
      t.frontier=result.frontier;t.full=result.full;
      if(result.full){if(t.masked)removeMask(t);continue;}
      if(result.path!==t.lastMaskPath){attr(t.maskPath,'d',result.path);t.lastMaskPath=result.path;}
      if(!t.masked){const value=`url("#vfx-mask-${t.id}")`;css(t.el,'mask-image',value);css(t.el,'-webkit-mask-image',value);t.masked=true;}
    }
  }
  function updateMesh(mesh,x,y,kind,time,dt){
    let max=0;const input=kind==='background'?{...pointer,y:pointer.clientY}:pointer;
    for(let i=0;i<mesh.points.length;i++){
      const p=mesh.points[i],px=p[0]+x,py=p[1]+y;
      let energy=M.field(px,py,input,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);
      for(const pulse of pulses){const times=pulse.arrivals.get(mesh);if(times)energy=Math.max(energy,M.pulseEnergy(time-pulse.time,times[i]));}
      const prior=mesh.energy[i],tau=energy>prior?CONFIG.attack:CONFIG.release;
      mesh.energy[i]=Math.abs(energy-prior)<.0005?energy:prior+(energy-prior)*(1-Math.exp(-dt/tau));
      const e=mesh.energy[i],d=kind==='background'?[0,0]:M.displacement(px,py,mesh.phase[i],e,time,mesh.short[i],kind);
      mesh.xy[i*2]=p[0]+d[0];mesh.xy[i*2+1]=p[1]+d[1];max=Math.max(max,e);
    }
    return max;
  }
  function cardVisibility(t,x,y){
    if(t.full||t.legal)return 1;
    return M.smooth(-18,18,M.revealDistance(x+t.r.x,y+t.r.y-scrollY,height,scrollY,t.seed));
  }
  function cacheBackground(){
    if(!baseCanvas){baseCanvas=document.createElement('canvas');baseCtx=baseCanvas.getContext('2d');}
    baseCanvas.width=bg.width;baseCanvas.height=bg.height;baseCtx.setTransform(bg.width/width,0,0,bg.height/height,0,0);
    const m=bgMesh;for(let n=0;n<m.triangles.length;n++)if(n%7===0){const tri=m.triangles[n];drawPoly(baseCtx,tri.map(i=>m.points[i]));baseCtx.fillStyle='rgba(150,150,150,.009)';baseCtx.fill();}
    baseCtx.beginPath();for(let n=0;n<m.edges.length;n++)if(n%3!==0){const [a,b]=m.edges[n];baseCtx.moveTo(...m.points[a]);baseCtx.lineTo(...m.points[b]);}baseCtx.strokeStyle='rgba(160,160,160,.027)';baseCtx.lineWidth=.55;baseCtx.stroke();
  }
  function renderMesh(ctx,mesh,kind,t){
    const isBG=kind==='background',buckets=mesh.buckets||(mesh.buckets=Array.from({length:12},()=>({items:[],sum:0})));for(const b of buckets){b.items.length=0;b.sum=0;}
    for(let n=0;n<mesh.edges.length;n++){
      const [a,b]=mesh.edges[n],cx=(mesh.xy[a*2]+mesh.xy[b*2])*.5,cy=(mesh.xy[a*2+1]+mesh.xy[b*2+1])*.5;
      let e=(mesh.energy[a]+mesh.energy[b])*.5;
      if(!isBG)e*=mesh.edgeGains[n]*cardVisibility(t,cx,cy);
      if(e<.012)continue;const group=buckets[Math.min(11,Math.floor(e*12))];group.items.push(n);group.sum+=e;
    }
    for(const b of buckets){if(!b.items.length)continue;const e=b.sum/b.items.length;ctx.beginPath();for(const n of b.items){const [a,k]=mesh.edges[n];ctx.moveTo(mesh.xy[a*2],mesh.xy[a*2+1]);ctx.lineTo(mesh.xy[k*2],mesh.xy[k*2+1]);}
      if(e>.65){ctx.lineWidth=2;ctx.strokeStyle=`rgba(255,133,43,${e*.045})`;ctx.stroke();}
      ctx.lineWidth=.65;ctx.strokeStyle=`rgba(255,177,85,${e*(isBG?.23:.43)})`;ctx.stroke();
    }
    for(let n=0;n<mesh.triangles.length;n++){if(n%5!==0)continue;const tri=mesh.triangles[n];let e=(mesh.energy[tri[0]]+mesh.energy[tri[1]]+mesh.energy[tri[2]])/3;if(e<.10)continue;
      const cx=tri.reduce((a,i)=>a+mesh.xy[i*2],0)/3,cy=tri.reduce((a,i)=>a+mesh.xy[i*2+1],0)/3;
      if(!isBG)e*=mesh.faceGains[n]*cardVisibility(t,cx,cy);drawPoly(ctx,tri.map(i=>[mesh.xy[i*2],mesh.xy[i*2+1]]));ctx.fillStyle=`rgba(255,153,62,${e*(isBG?.012:.028)})`;ctx.fill();
    }
  }
  function renderBorder(t,time){
    if(pointer.strength<.002||rectDistance(t.r,pointer.x,pointer.y)>CONFIG.radius*1.35)return;
    const {r,poly}=t,segments=[];
    const localRadius=(pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius)*.82;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/20);
      for(let j=0;j<n;j++){
        const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],q=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n];
        let e=M.field(r.x+(p[0]+q[0])/2,r.y+(p[1]+q[1])/2,pointer,localRadius);
        e*=cardVisibility(t,p[0],p[1]);if(e>.015)segments.push({p,q,e});
      }
    }
    for(let bucket=0;bucket<7;bucket++){
      const group=segments.filter(s=>Math.min(6,Math.floor(s.e*7))===bucket);if(!group.length)continue;
      fctx.beginPath();for(const s of group){fctx.moveTo(...s.p);fctx.lineTo(...s.q);}const alpha=(bucket+1)/7;
      if(quality>.75){fctx.lineWidth=4;fctx.strokeStyle=`rgba(255,135,30,${alpha*.20})`;fctx.shadowBlur=0;fctx.shadowColor=`rgba(222,155,70,${alpha*.35})`;fctx.stroke();fctx.shadowBlur=0;}
      fctx.lineWidth=.85;fctx.strokeStyle=`rgba(255,188,77,${alpha*.45})`;fctx.stroke();
    }
  }
  function renderTransitions(t,time){
    if(t.full||t.legal||t.kind==='heading')return;
    const intensity=.12+scrollEnergy*.55;
    fctx.save();drawPoly(fctx,t.poly);fctx.clip();
    for(const c of t.cells){if(c.frontier<.04)continue;const scale=Math.sqrt(c.v),p=c.points.map(v=>[c.x+(v[0]-c.x)*scale,c.y+(v[1]-c.y)*scale]);drawPoly(fctx,p);fctx.lineWidth=.65;fctx.strokeStyle=`rgba(255,176,88,${c.frontier*intensity*.55})`;fctx.stroke();}
    fctx.restore();
  }
  function render(time,dt){
    bctx.clearRect(0,0,width,height);bctx.drawImage(baseCanvas,0,0,width,height);fctx.clearRect(0,0,width,height);
    updateMesh(bgMesh,0,0,'background',time,dt);renderMesh(bctx,bgMesh,'background');
    // The background is beneath opaque cards. Generic card mesh excludes live text/icon rectangles.
    for(const t of targets){
      if(!t.visible)continue;fctx.save();fctx.translate(t.r.x,t.r.y-scrollY);
      if(t.kind==='card')renderBorder(t,time);
      if(t.mesh){
        const near=(pointer.strength>.002&&rectDistance(t.r,pointer.x,pointer.y)<CONFIG.radius*1.4)||pulses.some(p=>p.arrivals.has(t.mesh));
        const max=near||t.mesh.activeEnergy>.002?updateMesh(t.mesh,t.r.x,t.r.y,'card',time,dt):0;t.mesh.activeEnergy=max;
        if(max>.008){fctx.save();drawPoly(fctx,t.poly);fctx.clip();
          renderMesh(fctx,t.mesh,'card',t);fctx.restore();}
      }
      renderTransitions(t,time);fctx.restore();
    }
    renderParticles(time,Math.min(.04,dt));
  }
  function timeForGlyph(now,g){if(now-(g.emitAt||0)<.085)return false;g.emitAt=now;return true;}
  function updateGlyphs(now,dt){
    for(const g of glyphs){
      const r=g.r;if(!r||r.y+r.h<scrollY||r.y>scrollY+height)continue;
      const nearestX=M.clamp(pointer.x,r.x,r.x+r.w),nearestY=M.clamp(pointer.y,r.y,r.y+r.h);
      const wanted=M.field(nearestX,nearestY,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);
      const direct=rectDistance(r,pointer.x,pointer.y)<28;
      const e=wanted*(g.heading?(direct?CONFIG.headingGain:.30):1);g.energy+=(e-g.energy)*(1-Math.exp(-dt/(e>g.energy?.13:.42)));
      if(g.armed&&wanted>.42&&now-g.waveAt>.75){g.waveAt=now;g.origin=M.clamp((pointer.x-r.x)/Math.max(1,r.w));g.armed=false;}
      if(wanted<.08&&now-g.waveAt>1)g.armed=true;
      const age=now-g.waveAt,wave=age>=0&&age<.85;
      const construction=g.parent&&!g.parent.full?(g.parent.frontier||0)*.42:0;
      const alpha=M.clamp(g.energy*.95+(wave?.18*Math.sin(age/.85*Math.PI):0)+construction);
      css(g.el,'--vfx-text-alpha',alpha<.003?'0':alpha.toFixed(3));
      if(alpha<.003)continue;
      const p=((pointer.x-r.x)/Math.max(r.w,1)*100),reach=(pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius)/Math.max(r.w,1)*90;
      const py=pointer.y-r.y,rr=pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius;
      const fieldMask=`radial-gradient(ellipse ${rr}px ${rr*.85}px at ${pointer.x-r.x}px ${py}px,#000 0%,#0009 48%,transparent 100%)`;
      const waveX=(g.origin+age/.85*1.15)*100;
      const waveMask=`linear-gradient(90deg,transparent ${waveX-18}%,#ffe3a988 ${waveX}%,transparent ${waveX+7}%)`;
      css(g.el,'--vfx-text-wave',wave?waveMask:'linear-gradient(transparent,transparent)');
      const bounds=M.revealBounds(height,scrollY),upper=bounds.top-(r.y-scrollY),lower=bounds.bottom-(r.y-scrollY);
      const revealMask=`linear-gradient(180deg,transparent ${upper-55}px,#000 ${upper}px,transparent ${upper+55}px,transparent ${lower-55}px,#000 ${lower}px,transparent ${lower+55}px)`;
      css(g.el,'--vfx-text-mask',construction>.05?`${fieldMask},${revealMask}`:fieldMask);
      if(pointer.moved>2&&direct&&wanted>.5&&timeForGlyph(now,g)){const x=M.clamp(pointer.x,r.x+4,r.x+r.w-4);emit(x,r.y+r.h*.32,now,'glyph');}
    }
    for(const i of icons){if(!i.r)continue;const r=i.r,e=M.field(r.x+r.w/2,r.y+r.h/2,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);i.energy+=(e-i.energy)*(1-Math.exp(-dt/(e>i.energy?.12:.45)));css(i.el,'--vfx-icon-alpha',i.energy<.003?'0':(i.energy*.9).toFixed(3));}
  }
  function emit(x,y,time,source='hover'){
    const limit=Math.floor((width<700?CONFIG.mobilePool:CONFIG.pool)*(quality<1?.5:1));
    const p=particles.slice(0,limit).find(p=>p.life<=0);if(!p)return;
    const seed=M.hash(`${Math.round(x)}:${Math.round(y)}:${metrics.frames}`),rng=M.random(seed),dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy),angle=dist>.01?Math.atan2(dy,dx):seed*.01;
    const speed=32+rng()*42;p.x=x;p.y=y-(source==='background'?scrollY:0);p.vx=Math.cos(angle)*speed+M.clamp(pointer.vx,-200,200)*.02;p.vy=Math.sin(angle)*speed+M.clamp(pointer.vy,-200,200)*.02;p.age=0;p.life=.44+rng()*.40;p.total=p.life;p.born=time;p.seed=seed;p.size=1.5+rng()*3.4;p.angle=rng()*6.28;p.source=source;
  }
  function maybeEmit(time,dt){
    const moving=pointer.wanted&&pointer.moved>4&&time-lastPointerEmission>.025;
    if(moving){
      let nearest=null,dist=Infinity;const t=activeCard?.mesh?activeCard:null,mesh=t?t.mesh:bgMesh;
      for(let i=0;i<mesh.points.length;i++){const p=mesh.points[i],x=p[0]+(t?.r.x||0),y=p[1]+(t?.r.y??scrollY),d=Math.hypot(x-pointer.x,y-pointer.y);if(d<dist&&d>9){nearest=[x,y];dist=d;}}
      if(nearest&&dist<160){for(let k=0;k<3;k++)emit(nearest[0]+Math.sin(time*91+k)*18,nearest[1]+Math.cos(time*67+k)*12,time,t?'hover':'background');}pointer.moved=0;lastPointerEmission=time;
    }
    const delta=Math.abs(scrollY-previousScroll),smallScroll=delta>1&&delta<height*.6;
    const loading=intro&&time-start<CONFIG.loadSeconds;
    if(smallScroll||loading){particleCredit+=dt*(width<700?14:30);if(particleCredit>=1){particleCredit=0;for(const t of targets){if(!t.visible||t.full||t.legal)continue;const c=t.cells.find(c=>c.v>.08&&c.v<.5&&c.tri[0]%3===metrics.frames%3);if(c){emit(t.r.x+c.x,t.r.y+c.y,time,'transition');break;}}}}
    else particleCredit=0;
  }
  function renderParticles(time,dt){
    for(const p of particles){if(p.life<=0)continue;p.age=time-p.born;p.life=p.total-p.age;if(p.life<=0)continue;
      const curl=M.curl(p.x,p.y,time,p.seed);p.vx+=curl[0]*dt*7;p.vy+=curl[1]*dt*7;const drag=Math.exp(-2.8*dt);p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const alpha=M.smooth(0,.05,p.age)*(p.life/p.total)**1.6*.88,x=p.x,y=p.y-(p.source==='background'?0:scrollY),s=p.size;
      fctx.save();fctx.translate(x,y);fctx.rotate(p.angle+p.age*.8);drawPoly(fctx,[[0,-s*.6],[s*.55,s*.4],[-s*.55,s*.4]]);fctx.fillStyle=`rgba(255,178,61,${alpha})`;fctx.shadowBlur=quality>.75?4:0;fctx.shadowColor='rgba(255,149,25,.55)';fctx.fill();fctx.restore();
    }
  }
  function setCard(card){
    if(activeCard===card)return;
    if(activeCard&&activeCard!==focusCard)css(activeCard.el,'--vfx-image','0');activeCard=card;
    if(card)css(card.el,'--vfx-image','.8');
  }
  function cardFromTarget(el){if(!el)return null;return targets.find(t=>t.kind==='card'&&t.el.contains(el))||null;}
  function pointerMove(event){
    if(event.isPrimary===false)return;
    if(event.pointerType==='touch'&&pointer.id!==event.pointerId)return;
    const now=performance.now()/1000,dt=Math.max(.008,now-pointer.lastAt),x=event.clientX,y=event.clientY;
    const dist=Math.hypot(x-pointer.x,y-pointer.clientY);pointer.vx=M.clamp((x-pointer.x)/dt,-1000,1000);pointer.vy=M.clamp((y-pointer.clientY)/dt,-1000,1000);
    pointer.moved+=Math.min(dist,30);pointer.x=x;pointer.clientY=y;pointer.y=y+window.scrollY;pointer.lastAt=now;pointer.type=event.pointerType||'mouse';pointer.wanted=1;
    setCard(cardFromTarget(event.target));wake();
  }
  function pointerDown(event){if(event.isPrimary===false)return;pointer.id=event.pointerId;pointerMove(event);}
  function release(event,cancel=false){
    if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
    if(pointer.id!==event.pointerId)return;pointer.id=null;pointer.wanted=0;pointer.moved=0;setCard(null);
    if(cancel){metrics.pointerCancels++;wake();return;}
    metrics.pointerUps++;
    if(reduced.matches||!initialized||!enabled)return;
    const time=performance.now()/1000,arrivals=new Map();arrivals.set(bgMesh,M.pulseTimes(bgMesh,pointer.x,pointer.clientY,350));
    for(const t of targets)if(t.mesh&&rectDistance(t.r,pointer.x,pointer.y)<CONFIG.touchRadius)arrivals.set(t.mesh,M.pulseTimes(t.mesh,pointer.x-t.r.x,pointer.y-t.r.y,250));
    pulses.push({time,arrivals});if(pulses.length>2)pulses.shift();metrics.impulses++;wake();
  }
  function leave(){pointer.wanted=0;pointer.id=null;pointer.moved=0;setCard(null);wake();}
  function frame(ms){
    raf=0;if(disposed||!enabled||document.hidden||reduced.matches||forced.matches)return;
    const begin=performance.now(),now=ms/1000,raw=last?now-last:1/60,dt=Math.min(.04,Math.max(.001,raw)),responseDt=Math.min(1,Math.max(.001,raw));last=now;
    try{
      scrollY=window.scrollY;pointer.y=pointer.clientY+scrollY;
      if(Math.abs(root.clientWidth-width)>.5||Math.abs(innerHeight-height)>.5)dirty=true;
      scrollEnergy+=(Math.min(1,Math.abs(scrollY-previousScroll)/12)-scrollEnergy)*(1-Math.exp(-responseDt/.18));
      if(scrollY!==previousScroll&&pointer.wanted&&pointer.type!=='touch'){
        setCard(cardFromTarget(document.elementFromPoint(pointer.x,pointer.clientY)));
      }
      pointer.strength+=(pointer.wanted-pointer.strength)*(1-Math.exp(-responseDt/(pointer.wanted?CONFIG.attack:CONFIG.release)));
      if(pointer.strength<.0005&&!pointer.wanted)pointer.strength=0;
      if(!pointer.wanted&&now-lastActivity>=1.6){pointer.strength=0;bgMesh.energy.fill(0);for(const t of targets)if(t.mesh){t.mesh.energy.fill(0);t.mesh.activeEnergy=0;}for(const g of glyphs)g.energy=0;for(const i of icons)i.energy=0;}
      if(dirty)measure();
      updateReveals(now);updateImages();updateGlyphs(now,responseDt);maybeEmit(now,dt);render(now,responseDt);previousScroll=scrollY;
      for(let i=pulses.length-1;i>=0;i--)if(now-pulses[i].time>1.1)pulses.splice(i,1);
      metrics.frames++;metrics.samples.push(performance.now()-begin);metrics.intervals.push(raw*1000);if(metrics.samples.length>240){metrics.samples.shift();metrics.intervals.shift();}
      const cost=performance.now()-begin;if(cost>12)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
      if(cost<5)fastFrames++;else fastFrames=0;
      if(slowFrames>60&&quality> .7){quality=.7;metrics.quality=quality;fit();cacheBackground();slowFrames=0;}
      if(fastFrames>600&&quality<1){quality=1;metrics.quality=quality;fit();cacheBackground();fastFrames=0;}
      if(now-lastActivity<1.6||particles.some(p=>p.life>0)||pulses.length||intro&&now-start<CONFIG.loadSeconds)raf=requestAnimationFrame(frame);
    }catch(error){metrics.error=String(error);fallback();console.warn('Memento VFX: static fallback.',error);}
  }
  function resetVisuals(){
    root.classList.remove('vfx-boot','vfx-ready');
    for(const t of targets){removeMask(t);t.el.style.removeProperty('--vfx-image');}
    for(const g of glyphs)g.el.style.removeProperty('--vfx-text-alpha');for(const {clone}of colorLayers)css(clone,'--vfx-color-on','0');
    for(const i of icons)i.el.style.removeProperty('--vfx-icon-alpha');
    if(bctx)bctx.clearRect(0,0,width,height);if(fctx)fctx.clearRect(0,0,width,height);
  }
  function fallback(){cancelAnimationFrame(raf);raf=0;enabled=false;resetVisuals();}
  function wake(){lastActivity=performance.now()/1000;if(!raf)startLoop();}
  function invalidate(){dirty=true;wake();}
  function startLoop(){last=0;if(!raf&&!disposed&&enabled&&!reduced.matches&&!forced.matches&&!document.hidden)raf=requestAnimationFrame(frame);}
  function preference(){
    if(reduced.matches||forced.matches){cancelAnimationFrame(raf);raf=0;intro=false;resetVisuals();}
    else if(initialized&&enabled){root.classList.add('vfx-ready');invalidate();}
  }
  function visibility(){
    if(document.hidden){cancelAnimationFrame(raf);raf=0;leave();for(const p of particles)p.life=0;pulses.length=0;intro=false;}
    else {invalidate();}
  }
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);raf=0;listeners.splice(0).forEach(fn=>fn());resizeObserver?.disconnect();mutationObserver?.disconnect();resetVisuals();
    for(const t of targets){t.el.classList.remove('vfx-reveal');delete t.el.dataset.vfxSurface;}
    for(const g of glyphs){g.el.classList.remove('vfx-glyph');g.el.removeAttribute('data-vfx-text');for(const k of ['--vfx-texture','--vfx-text-mask','--vfx-text-wave','--vfx-texture-size'])g.el.style.removeProperty(k);}
    for(const i of icons){i.el.classList.remove('vfx-icon');i.el.style.removeProperty('--vfx-icon-texture');}
    for(const {clone}of colorLayers)clone.remove();colorLayers.length=0;bg?.remove();fg?.remove();defsSvg?.remove();pulses.length=0;for(const p of particles)p.life=0;bgMesh=null;targets.length=0;glyphs.length=0;icons.length=0;
  }
  function getMetrics(){
    const summary=values=>{const a=values.filter(n=>Number.isFinite(n)).slice().sort((a,b)=>a-b);return a.length?{samples:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.ceil(a.length*.95)-1]}:null;};
    return {version:'12.0.0-edge-fragments',backgroundSpace:'viewport-css-pixels',logicalWidth:width,logicalHeight:height,canvasCSSWidth:bg?.getBoundingClientRect().width,renderer:'Canvas2D + SVG alpha masks',enabled,disposed,sleeping:!raf,maskBytes:targets.reduce((n,t)=>n+(t.masked?t.lastMaskPath.length:0),0),reducedMotion:reduced.matches,frames:metrics.frames,fxMilliseconds:summary(metrics.samples),frameMilliseconds:summary(metrics.intervals),quality,particles:particles.filter(p=>p.life>0).length,pulses:pulses.length,pointerUps:metrics.pointerUps,pointerCancels:metrics.pointerCancels,impulses:metrics.impulses,layoutBuilds:metrics.layoutBuilds,backgroundVertices:bgMesh?.points.length||0,targetCount:targets.length,maskedTargets:targets.filter(t=>t.masked).map(t=>t.id),activeCard:activeCard?.id||null,error:metrics.error};
  }
  let resizeObserver,mutationObserver;
  window.MementoStartVFX=Object.freeze({config:CONFIG,dispose,getMetrics,inspect(){return {pointer:{x:pointer.x,y:pointer.clientY,strength:pointer.strength},targets:targets.filter(t=>t.visible).map(t=>({id:t.id,kind:t.kind,rect:{...t.r,y:t.r.y-scrollY},masked:t.masked,coverage:t.cells.map(c=>+c.v.toFixed(5)),meshEnergy:t.mesh?Math.max(...t.mesh.energy):0,centerGain:CONFIG.centerGain})),glyphs:glyphs.map(g=>({text:g.el.textContent,energy:g.energy,rect:{...g.r,y:g.r.y-scrollY}}))};},setEnabled(value){enabled=!!value;if(enabled){preference();invalidate();}else fallback();},invalidateLayout:invalidate});
  async function init(){
    try{
      bg=document.createElement('canvas');fg=document.createElement('canvas');
      for(const [c,kind] of [[bg,'background'],[fg,'foreground']]){c.className=`memento-vfx-canvas memento-vfx-${kind}`;c.setAttribute('aria-hidden','true');document.body.append(c);}
      bctx=bg.getContext('2d',{alpha:true});fctx=fg.getContext('2d',{alpha:true});if(!bctx||!fctx)throw new Error('Canvas2D unavailable');
      defsSvg=svgEl('svg',{'aria-hidden':'true',width:0,height:0});defsSvg.style.cssText='position:absolute;pointer-events:none;width:0;height:0;overflow:hidden';defs=svgEl('defs');defsSvg.append(defs);document.body.append(defsSvg);
      listen(bg,'contextlost',fallback);listen(fg,'contextlost',fallback);
      await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,350))]);
      if(disposed)return;
      intro=root.classList.contains('vfx-boot')&&!reduced.matches&&!forced.matches&&window.scrollY<5;
      start=performance.now()/1000;metrics.startedAt=start;register();registerImages();measure();initialized=true;
      clearTimeout(window.__mementoVfxBootTimer);root.classList.remove('vfx-boot');root.classList.add('vfx-ready');
      listen(window,'scroll',wake,{passive:true});listen(window,'pointermove',pointerMove,{passive:true});listen(window,'pointerdown',pointerDown,{passive:true});listen(window,'pointerup',e=>release(e),{passive:true});listen(window,'pointercancel',e=>release(e,true),{passive:true});
      listen(document.documentElement,'pointerleave',leave,{passive:true});listen(window,'blur',leave);listen(window,'resize',invalidate,{passive:true});
      listen(document,'visibilitychange',visibility);listen(reduced,'change',preference);listen(forced,'change',preference);
      listen(document,'focusin',e=>{focusCard=cardFromTarget(e.target);if(focusCard){css(focusCard.el,'--vfx-image','.8');removeMask(focusCard);}invalidate();});
      listen(document,'focusout',()=>{if(focusCard&&focusCard!==activeCard)css(focusCard.el,'--vfx-image','0');focusCard=null;invalidate();});
      listen(window,'pagehide',e=>{if(e.persisted){cancelAnimationFrame(raf);raf=0;intro=false;}else dispose();});listen(window,'pageshow',e=>{if(e.persisted){intro=false;invalidate();}});
      listen(document.fonts,'loadingdone',invalidate);
      if('ResizeObserver'in window){resizeObserver=new ResizeObserver(invalidate);for(const t of targets)resizeObserver.observe(t.el);resizeObserver.observe(document.querySelector('main'));}
      mutationObserver=new MutationObserver(invalidate);mutationObserver.observe(document.querySelector('main'),{characterData:true,childList:true,subtree:true});
      preference();wake();
    }catch(error){metrics.error=String(error);fallback();console.warn('Memento VFX: readable fallback.',error);}
  }
  init();
})();
