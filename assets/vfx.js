/* Memento START / R4. Two decorative render layers, one engine and one clock.
   Canvas2D is deliberate: no extra WebGL context, library or DOM rasterization.
   Real DOM content is revealed with cached SVG alpha masks. */
(() => {
  'use strict';
  const M=globalThis.MementoVFXMath,root=document.documentElement;
  if(!M){root.classList.remove('vfx-boot');return;}
  window.MementoStartVFX?.dispose();
  const CONFIG=Object.freeze({radius:260,touchRadius:170,dpr:1.5,mobileDpr:1.25,pool:64,mobilePool:24,loadSeconds:1.65,scrollBand:.16,release:.48,attack:.12,headingGain:.12,centerGain:.18});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
  const ns='http://www.w3.org/2000/svg',listeners=[],targets=[],glyphs=[],icons=[],pulses=[],particles=Array.from({length:CONFIG.pool},()=>({life:0}));
  let bg,fg,bctx,fctx,defsSvg,defs,bgMesh,raf=0,disposed=false,enabled=true,initialized=false,dirty=true,width=innerWidth,height=innerHeight,dpr=1,last=0,start=0,scrollY=window.scrollY,previousScroll=scrollY,layoutWidth=0,bgHeight=0;
  let intro=false,activeCard=null,focusCard=null,particleCredit=0,quality=1,slowFrames=0,fastFrames=0,lastPointerEmission=0;
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
  function makeTexture(seed,cell=5,w=144,h=48){
    const rng=M.random(seed),pts=[];
    for(let y=-cell;y<h+cell;y+=cell)for(let x=-cell;x<w+cell;x+=cell)pts.push([x+rng()*cell*.8,y+rng()*cell*.8]);
    const triangles=M.triangulate(pts);
    const body=triangles.map(t=>`<path d="M${t.map(i=>pts[i].map(n=>n.toFixed(2)).join(',')).join('L')}Z" fill="${['#e6bd84','#c48c49','#f1d7ae','#9d6b35'][Math.floor(rng()*4)]}" fill-opacity="${(.6+rng()*.38).toFixed(2)}" stroke="#49321d" stroke-width=".45" stroke-opacity=".75"/>`).join('');
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${ns}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}")`;
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
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,width<700?CONFIG.mobileDpr:CONFIG.dpr)*quality;
    for(const c of [bg,fg]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    bctx.setTransform(dpr,0,0,dpr,0,0);fctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function measure(){
    dirty=false;fit();metrics.layoutBuilds++;
    // All layout reads precede mask/texture writes.
    const records=targets.map(t=>({t,r:readRect(t.el),cut:parseFloat(getComputedStyle(t.el).getPropertyValue('--cut'))||16,protection:[...t.el.querySelectorAll('.contact-copy,.location-address,.hours,.faq-list,.faq-title,.legal-layout,.board-title')].map(readRect)}));
    const glyphRecords=glyphs.map(g=>({g,r:readRect(g.el),font:parseFloat(getComputedStyle(g.el).fontSize)}));
    const iconRecords=icons.map(i=>({i,r:readRect(i.el)}));
    const pageHeight=Math.ceil((document.documentElement.scrollHeight+512)/1024)*1024;
    if(layoutWidth!==width||pageHeight>bgHeight||!bgMesh){bgHeight=pageHeight;layoutWidth=width;bgMesh=M.sampleMesh(width,bgHeight,761204,'background');}
    for(const {t,r,cut,protection} of records){
      const changed=!t.r||Math.abs(t.r.w-r.w)>.5||Math.abs(t.r.h-r.h)>.5;
      t.r=r;t.protection=protection.map(p=>({x:p.x-r.x-3,y:p.y-r.y-3,w:p.w+6,h:p.h+6}));
      if(!changed)continue;
      t.poly=M.polygon(r.w,r.h,t.kind==='card'?cut:0,t.map);t.cut=cut;
      t.mesh=t.kind==='card'&&!t.map?M.sampleMesh(r.w,r.h,t.seed,'card',cut):null;
      if(t.mesh){
        const gain=(x,y)=>CONFIG.centerGain+(1-CONFIG.centerGain)*(1-M.smooth(0,Math.min(r.w,r.h)*.22,M.nearest(x,y,t.poly).distance));
        t.mesh.edgeGains=Float32Array.from(t.mesh.edges,([a,b])=>gain((t.mesh.points[a][0]+t.mesh.points[b][0])/2,(t.mesh.points[a][1]+t.mesh.points[b][1])/2));
        t.mesh.faceGains=Float32Array.from(t.mesh.triangles,tri=>gain(tri.reduce((n,i)=>n+t.mesh.points[i][0],0)/3,tri.reduce((n,i)=>n+t.mesh.points[i][1],0)/3));
      }
      t.reveal=M.sampleMesh(r.w,r.h,t.seed^0x7771,'reveal',t.kind==='card'?cut:0,t.map);
      const rng=M.random(t.seed^0xa8);t.cells=t.reveal.triangles.map(tri=>{
        const p=tri.map(i=>t.reveal.points[i]),x=p.reduce((n,v)=>n+v[0],0)/3,y=p.reduce((n,v)=>n+v[1],0)/3;
        return {tri,x,y,jitter:(rng()-.5)*18,delay:(x/Math.max(r.w,1)+(1-y/Math.max(r.h,1)))*.21+rng()*.08,v:1,old:-1};
      });
      if(t.mask)t.mask.remove();
      t.mask=svgEl('mask',{id:`vfx-mask-${t.id}`,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width:r.w,height:r.h,'mask-type':'alpha'});
      t.maskNodes=t.cells.map(c=>{const p=svgEl('polygon',{fill:'white',points:c.tri.map(i=>t.reveal.points[i].join(',')).join(' ')});t.mask.append(p);return p;});defs.append(t.mask);
      t.masked=false;t.full=false;
    }
    for(const {g,r,font}of glyphRecords){
      g.r=r;if(g.el.getAttribute('data-vfx-text')!==g.el.textContent)g.el.setAttribute('data-vfx-text',g.el.textContent);
      if(g.font!==font){g.font=font;css(g.el,'--vfx-texture',makeTexture(g.seed,Math.max(3.1,Math.min(7,font*.145))));}
    }
    for(const {i,r}of iconRecords)i.r=r;
    // Resize never restarts intro. Rebuild masks immediately at the current scroll position.
    updateReveals(performance.now()/1000);
  }
  function revealAt(t,c,now){
    if(t.legal||t.map||t.el.contains(document.activeElement))return 1;
    const load=intro?M.smooth(c.delay,c.delay+.48,(now-start)/CONFIG.loadSeconds):1;
    // Preserve the initial hero near the top of the document; scroll bands act once it leaves.
    const y=t.r.y+c.y-scrollY+c.jitter;
    const top=scrollY<5?-height*.26:42;
    return Math.min(load,M.visibility(y,top,height+18,height*CONFIG.scrollBand,height*CONFIG.scrollBand));
  }
  function updateReveals(now){
    const settled=!intro||(now-start>CONFIG.loadSeconds+.12&&lastRevealTime-start>CONFIG.loadSeconds+.12);
    if(settled&&lastRevealScroll===scrollY&&lastRevealLayout===metrics.layoutBuilds)return;
    lastRevealScroll=scrollY;lastRevealLayout=metrics.layoutBuilds;lastRevealTime=now;
    for(const t of targets){
      if(!t.r)continue;
      t.visible=t.r.y+t.r.h>scrollY-40&&t.r.y<scrollY+height+40;
      if(!t.visible){if(!t.full){removeMask(t);t.full=true;}continue;}
      let full=true;
      for(const c of t.cells){c.v=revealAt(t,c,now);if(c.v<.999)full=false;}
      if(full){if(t.masked)removeMask(t);t.full=true;continue;}
      t.full=false;
      if(!t.masked){const value=`url("#vfx-mask-${t.id}")`;css(t.el,'mask-image',value);css(t.el,'-webkit-mask-image',value);t.masked=true;for(const c of t.cells)c.old=-1;}
      t.cells.forEach((c,i)=>{
        const v=Math.round(c.v*250)/250;if(v===c.old)return;c.old=v;
        attr(t.maskNodes[i],'points',M.scaledTriangle(t.reveal.points,c.tri,v).map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' '));
        attr(t.maskNodes[i],'fill-opacity',M.smooth(0,.16,v).toFixed(3));
      });
    }
  }
  function updateMesh(mesh,x,y,kind,time,dt){
    let max=0;
    for(let i=0;i<mesh.points.length;i++){
      const p=mesh.points[i],px=p[0]+x,py=p[1]+y;
      let energy=M.field(px,py,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);
      for(const pulse of pulses){const times=pulse.arrivals.get(mesh);if(times)energy=Math.max(energy,M.pulseEnergy(time-pulse.time,times[i]));}
      const prior=mesh.energy[i],tau=energy>prior?CONFIG.attack:CONFIG.release;
      mesh.energy[i]=Math.abs(energy-prior)<.0005?energy:prior+(energy-prior)*(1-Math.exp(-dt/tau));
      const e=mesh.energy[i],d=M.displacement(px,py,mesh.phase[i],e,time,mesh.short[i],kind);
      mesh.xy[i*2]=p[0]+d[0];mesh.xy[i*2+1]=p[1]+d[1];max=Math.max(max,e);
    }
    return max;
  }
  function cardVisibility(t,x,y){
    if(t.full||t.legal||t.map)return 1;
    return M.visibility(t.r.y+y-scrollY,scrollY<5?-height*.26:42,height+18,height*CONFIG.scrollBand,height*CONFIG.scrollBand);
  }
  function renderMesh(ctx,mesh,kind,t){
    const isBG=kind==='background',x=t?.r.x||0,y=t?.r.y||0;
    const edgeBuckets=Array.from({length:10},()=>[]),faceBuckets=Array.from({length:5},()=>[]),neutral=[];
    for(let n=0;n<mesh.triangles.length;n++){
      const tri=mesh.triangles[n],cy=tri.reduce((s,i)=>s+mesh.xy[i*2+1],0)/3;
      if(cy+y<scrollY-80||cy+y>scrollY+height+80)continue;
      const cx=tri.reduce((s,i)=>s+mesh.xy[i*2],0)/3;
      let e=tri.reduce((s,i)=>s+mesh.energy[i],0)/3;
      if(!isBG){e*=mesh.faceGains[n]*cardVisibility(t,cx,cy);}
      if(e>.035)faceBuckets[Math.min(4,Math.floor(e*5))].push(tri);
      else if(isBG&&n%4===0&&Math.sin(cx*.008+cy*.004)>.1)neutral.push(tri);
    }
    const faces=(tris,fill)=>{if(!tris.length)return;ctx.fillStyle=fill;ctx.beginPath();for(const tri of tris){ctx.moveTo(mesh.xy[tri[0]*2],mesh.xy[tri[0]*2+1]);ctx.lineTo(mesh.xy[tri[1]*2],mesh.xy[tri[1]*2+1]);ctx.lineTo(mesh.xy[tri[2]*2],mesh.xy[tri[2]*2+1]);ctx.closePath();}ctx.fill();};
    if(isBG)faces(neutral,'rgba(174,174,174,.012)');
    faceBuckets.forEach((f,i)=>faces(f,`rgba(201,139,66,${(i+1)*.006})`));
    const neutralEdges=[];
    for(let edgeIndex=0;edgeIndex<mesh.edges.length;edgeIndex++){
      const edge=mesh.edges[edgeIndex];
      const [a,b]=edge,ax=mesh.xy[a*2],ay=mesh.xy[a*2+1],bx=mesh.xy[b*2],by=mesh.xy[b*2+1];
      if(Math.max(ay,by)+y<scrollY-20||Math.min(ay,by)+y>scrollY+height+20)continue;
      const cx=(ax+bx)/2,cy=(ay+by)/2;
      let e=(mesh.energy[a]+mesh.energy[b])*.5;
      if(isBG){
        const flank=1-M.smooth(.08,.4,Math.min(cx/width,1-cx/width));
        const patch=M.clamp(.45+.34*Math.sin(cx*.007+cy*.004)+.27*Math.cos(cy*.009-cx*.003));
        const alpha=(.012+flank*.06)*patch;
        if(alpha>.009)neutralEdges.push({edge,alpha});
      }else {e*=mesh.edgeGains[edgeIndex]*cardVisibility(t,cx,cy);}
      if(e>.014)edgeBuckets[Math.min(9,Math.floor(e*10))].push(edge);
    }
    const stroke=(edges,color,lineWidth=.65)=>{if(!edges.length)return;ctx.beginPath();for(const [a,b]of edges){ctx.moveTo(mesh.xy[a*2],mesh.xy[a*2+1]);ctx.lineTo(mesh.xy[b*2],mesh.xy[b*2+1]);}ctx.lineWidth=lineWidth;ctx.strokeStyle=color;ctx.stroke();};
    if(isBG)for(let bucket=0;bucket<4;bucket++)stroke(neutralEdges.filter(a=>Math.min(3,Math.floor(a.alpha*50))===bucket).map(a=>a.edge),`rgba(183,183,183,${.018+bucket*.019})`,.6);
    edgeBuckets.forEach((edges,i)=>stroke(edges,`rgba(221,164,90,${.025+(i/9)*.30})`,isBG?.7:.62));
    ctx.fillStyle='rgba(174,174,174,.24)';ctx.beginPath();
    for(let i=0;i<mesh.points.length;i++){const px=mesh.xy[i*2],py=mesh.xy[i*2+1];if(py+y<scrollY||py+y>scrollY+height)continue;if(isBG&&i%3===0&&mesh.energy[i]<.03){ctx.moveTo(px+.38,py);ctx.arc(px,py,.38,0,Math.PI*2);}}
    ctx.fill();ctx.fillStyle='rgba(224,174,112,.32)';ctx.beginPath();
    for(let i=0;i<mesh.points.length;i++){if(mesh.energy[i]<.12)continue;const px=mesh.xy[i*2],py=mesh.xy[i*2+1];if(py+y<scrollY||py+y>scrollY+height)continue;ctx.moveTo(px+.42,py);ctx.arc(px,py,.42,0,Math.PI*2);}ctx.fill();
  }
  function renderBorder(t,time){
    if(pointer.strength<.002||rectDistance(t.r,pointer.x,pointer.y)>CONFIG.radius*1.35)return;
    const {r,poly}=t,segments=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/10);
      for(let j=0;j<n;j++){
        const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],q=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n];
        let e=M.field(r.x+(p[0]+q[0])/2,r.y+(p[1]+q[1])/2,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);
        e*=cardVisibility(t,p[0],p[1]);if(e>.015)segments.push({p,q,e});
      }
    }
    for(let bucket=0;bucket<7;bucket++){
      const group=segments.filter(s=>Math.min(6,Math.floor(s.e*7))===bucket);if(!group.length)continue;
      fctx.beginPath();for(const s of group){fctx.moveTo(...s.p);fctx.lineTo(...s.q);}const alpha=(bucket+1)/7;
      if(quality>.75){fctx.lineWidth=5;fctx.strokeStyle=`rgba(209,135,50,${alpha*.08})`;fctx.shadowBlur=9;fctx.shadowColor=`rgba(222,155,70,${alpha*.35})`;fctx.stroke();fctx.shadowBlur=0;}
      fctx.lineWidth=.85;fctx.strokeStyle=`rgba(242,190,122,${alpha*.8})`;fctx.stroke();
    }
  }
  function renderTransitions(t){
    if(t.full||t.legal||t.map||t.kind==='heading')return;
    const mesh=t.reveal;fctx.lineWidth=.65;
    for(const c of t.cells){
      if(c.v<=.002||c.v>=.998)continue;
      const e=Math.sin(c.v*Math.PI),p=c.tri.map(i=>mesh.points[i]);
      drawPoly(fctx,p);fctx.strokeStyle=`rgba(216,181,133,${e*.24})`;fctx.stroke();
      // A handful of stable precursor vertices, not a second always-on particle layer.
      if(c.v<.3&&c.tri[0]%5===0){const [x,y]=p[0];drawPoly(fctx,[[x,y-1.1],[x+1,y+.8],[x-1,y+.8]]);fctx.fillStyle=`rgba(222,174,108,${e*.45})`;fctx.fill();}
    }
  }
  function render(time,dt){
    bctx.clearRect(0,0,width,height);fctx.clearRect(0,0,width,height);
    bctx.save();bctx.translate(0,-scrollY);updateMesh(bgMesh,0,0,'background',time,dt);renderMesh(bctx,bgMesh,'background');bctx.restore();
    // The background is beneath opaque cards. Generic card mesh excludes live text/icon rectangles.
    for(const t of targets){
      if(!t.visible)continue;fctx.save();fctx.translate(t.r.x,t.r.y-scrollY);
      if(t.kind==='card')renderBorder(t,time);
      if(t.mesh){
        const near=(pointer.strength>.002&&rectDistance(t.r,pointer.x,pointer.y)<CONFIG.radius*1.4)||pulses.some(p=>p.arrivals.has(t.mesh));
        const max=near||t.mesh.activeEnergy>.002?updateMesh(t.mesh,t.r.x,t.r.y,'card',time,dt):0;t.mesh.activeEnergy=max;
        if(max>.008){fctx.save();drawPoly(fctx,t.poly);fctx.clip();
          fctx.beginPath();fctx.rect(0,0,t.r.w,t.r.h);for(const p of t.protection)fctx.rect(p.x,p.y,p.w,p.h);fctx.clip('evenodd');renderMesh(fctx,t.mesh,'card',t);fctx.restore();}
      }
      renderTransitions(t);fctx.restore();
    }
    renderParticles(time,Math.min(.04,dt));
  }
  function updateGlyphs(now,dt){
    for(const g of glyphs){
      const r=g.r;if(!r||r.y+r.h<scrollY||r.y>scrollY+height)continue;
      const nearestX=M.clamp(pointer.x,r.x,r.x+r.w),nearestY=M.clamp(pointer.y,r.y,r.y+r.h);
      const wanted=M.field(nearestX,nearestY,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);
      const e=wanted*(g.heading?CONFIG.headingGain:1);g.energy+=(e-g.energy)*(1-Math.exp(-dt/(e>g.energy?.13:.42)));
      if(!g.heading&&g.armed&&wanted>.42&&now-g.waveAt>.75){g.waveAt=now;g.origin=M.clamp((pointer.x-r.x)/Math.max(1,r.w));g.armed=false;}
      if(wanted<.08&&now-g.waveAt>1)g.armed=true;
      const age=now-g.waveAt,wave=age>=0&&age<.85&&!g.heading;
      const construction=g.heading&&g.parent&&!g.parent.full?.16:0;
      const alpha=M.clamp(g.energy*.82+(wave?.28*Math.sin(age/.85*Math.PI):0)+construction);
      css(g.el,'--vfx-text-alpha',alpha<.003?'0':alpha.toFixed(3));
      if(alpha<.003)continue;
      const p=((pointer.x-r.x)/Math.max(r.w,1)*100),reach=(pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius)/Math.max(r.w,1)*90;
      const fieldMask=construction?'linear-gradient(#000,#000)':`linear-gradient(90deg,transparent ${p-reach}%,#000 ${p}%,transparent ${p+reach}%)`;
      const waveX=(g.origin+age/.85*1.15)*100;
      const waveMask=`linear-gradient(90deg,transparent ${waveX-20}%,#000 ${waveX}%,transparent ${waveX+9}%)`;
      css(g.el,'--vfx-text-mask',wave?`${fieldMask},${waveMask}`:fieldMask);
    }
    for(const i of icons){if(!i.r)continue;const r=i.r,e=M.field(r.x+r.w/2,r.y+r.h/2,pointer,pointer.type==='touch'?CONFIG.touchRadius:CONFIG.radius);i.energy+=(e-i.energy)*(1-Math.exp(-dt/(e>i.energy?.12:.45)));css(i.el,'--vfx-icon-alpha',i.energy<.003?'0':(i.energy*.9).toFixed(3));}
  }
  function emit(x,y,time,source='hover'){
    const limit=Math.floor((width<700?CONFIG.mobilePool:CONFIG.pool)*(quality<1?.5:1));
    const p=particles.slice(0,limit).find(p=>p.life<=0);if(!p)return;
    const seed=M.hash(`${Math.round(x)}:${Math.round(y)}:${metrics.frames}`),rng=M.random(seed),dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy),angle=dist>.01?Math.atan2(dy,dx):seed*.01;
    const speed=25+rng()*30;p.x=x;p.y=y;p.vx=Math.cos(angle)*speed+M.clamp(pointer.vx,-200,200)*.02;p.vy=Math.sin(angle)*speed+M.clamp(pointer.vy,-200,200)*.02;p.age=0;p.life=.26+rng()*.30;p.total=p.life;p.born=time;p.seed=seed;p.size=1.2+rng()*1.4;p.angle=rng()*6.28;p.source=source;
  }
  function maybeEmit(time,dt){
    const moving=pointer.wanted&&pointer.moved>4&&time-lastPointerEmission>.09;
    if(moving){
      let nearest=null,dist=Infinity;const t=activeCard?.mesh?activeCard:null,mesh=t?t.mesh:bgMesh;
      for(let i=0;i<mesh.points.length;i++){const p=mesh.points[i],x=p[0]+(t?.r.x||0),y=p[1]+(t?.r.y||0),d=Math.hypot(x-pointer.x,y-pointer.y);if(d<dist&&d>9){nearest=[x,y];dist=d;}}
      if(nearest&&dist<110)emit(...nearest,time);pointer.moved=0;lastPointerEmission=time;
    }
    const delta=Math.abs(scrollY-previousScroll),smallScroll=delta>1&&delta<height*.6;
    const loading=intro&&time-start<CONFIG.loadSeconds;
    if(smallScroll||loading){particleCredit+=dt*(width<700?4:8);if(particleCredit>=1){particleCredit=0;for(const t of targets){if(!t.visible||t.full||t.map||t.legal)continue;const c=t.cells.find(c=>c.v>.08&&c.v<.5&&c.tri[0]%3===metrics.frames%3);if(c){emit(t.r.x+c.x,t.r.y+c.y,time,'transition');break;}}}}
    else particleCredit=0;
  }
  function renderParticles(time,dt){
    for(const p of particles){if(p.life<=0)continue;p.age=time-p.born;p.life=p.total-p.age;if(p.life<=0)continue;
      const curl=M.curl(p.x,p.y,time,p.seed);p.vx+=curl[0]*dt*7;p.vy+=curl[1]*dt*7;const drag=Math.exp(-2.8*dt);p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const alpha=M.smooth(0,.05,p.age)*(p.life/p.total)**2*.55,x=p.x,y=p.y-scrollY,s=p.size;
      fctx.save();fctx.translate(x,y);fctx.rotate(p.angle+p.age*.8);drawPoly(fctx,[[0,-s*.6],[s*.55,s*.4],[-s*.55,s*.4]]);fctx.fillStyle=`rgba(219,170,104,${alpha})`;fctx.fill();fctx.restore();
    }
  }
  function setCard(card){
    if(activeCard===card)return;
    if(activeCard&&activeCard!==focusCard)css(activeCard.el,'--vfx-image','0');activeCard=card;
    if(card)css(card.el,'--vfx-image','1');
  }
  function cardFromTarget(el){return targets.find(t=>t.kind==='card'&&t.el.contains(el))||null;}
  function pointerMove(event){
    if(event.isPrimary===false)return;
    if(event.pointerType==='touch'&&pointer.id!==event.pointerId)return;
    const now=performance.now()/1000,dt=Math.max(.008,now-pointer.lastAt),x=event.clientX,y=event.clientY;
    const dist=Math.hypot(x-pointer.x,y-pointer.clientY);pointer.vx=M.clamp((x-pointer.x)/dt,-1000,1000);pointer.vy=M.clamp((y-pointer.clientY)/dt,-1000,1000);
    pointer.moved+=Math.min(dist,30);pointer.x=x;pointer.clientY=y;pointer.y=y+window.scrollY;pointer.lastAt=now;pointer.type=event.pointerType||'mouse';pointer.wanted=1;
    setCard(cardFromTarget(event.target));
  }
  function pointerDown(event){if(event.isPrimary===false)return;pointer.id=event.pointerId;pointerMove(event);}
  function release(event,cancel=false){
    if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
    if(pointer.id!==event.pointerId)return;pointer.id=null;pointer.wanted=0;pointer.moved=0;setCard(null);
    if(cancel){metrics.pointerCancels++;return;}
    metrics.pointerUps++;
    if(reduced.matches||!initialized||!enabled)return;
    const time=performance.now()/1000,arrivals=new Map();arrivals.set(bgMesh,M.pulseTimes(bgMesh,pointer.x,pointer.y,350));
    for(const t of targets)if(t.mesh&&rectDistance(t.r,pointer.x,pointer.y)<CONFIG.touchRadius)arrivals.set(t.mesh,M.pulseTimes(t.mesh,pointer.x-t.r.x,pointer.y-t.r.y,250));
    pulses.push({time,arrivals});if(pulses.length>2)pulses.shift();metrics.impulses++;
  }
  function leave(){pointer.wanted=0;pointer.id=null;pointer.moved=0;setCard(null);}
  function frame(ms){
    raf=0;if(disposed||!enabled||document.hidden||reduced.matches||forced.matches)return;
    const begin=performance.now(),now=ms/1000,raw=last?now-last:1/60,dt=Math.min(.04,Math.max(.001,raw)),responseDt=Math.min(1,Math.max(.001,raw));last=now;
    try{
      scrollY=window.scrollY;pointer.y=pointer.clientY+scrollY;
      pointer.strength+=(pointer.wanted-pointer.strength)*(1-Math.exp(-responseDt/(pointer.wanted?CONFIG.attack:CONFIG.release)));
      if(pointer.strength<.0005&&!pointer.wanted)pointer.strength=0;
      if(dirty)measure();
      updateReveals(now);updateGlyphs(now,responseDt);maybeEmit(now,dt);render(now,responseDt);previousScroll=scrollY;
      for(let i=pulses.length-1;i>=0;i--)if(now-pulses[i].time>1.1)pulses.splice(i,1);
      metrics.frames++;metrics.samples.push(performance.now()-begin);metrics.intervals.push(raw*1000);if(metrics.samples.length>240){metrics.samples.shift();metrics.intervals.shift();}
      const cost=performance.now()-begin;if(cost>12)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
      if(cost<5)fastFrames++;else fastFrames=0;
      if(slowFrames>60&&quality> .7){quality=.7;metrics.quality=quality;fit();slowFrames=0;}
      if(fastFrames>600&&quality<1){quality=1;metrics.quality=quality;fit();fastFrames=0;}
      raf=requestAnimationFrame(frame);
    }catch(error){metrics.error=String(error);fallback();console.warn('Memento VFX: static fallback.',error);}
  }
  function resetVisuals(){
    root.classList.remove('vfx-boot','vfx-ready');
    for(const t of targets){removeMask(t);t.el.style.removeProperty('--vfx-image');}
    for(const g of glyphs)g.el.style.removeProperty('--vfx-text-alpha');
    for(const i of icons)i.el.style.removeProperty('--vfx-icon-alpha');
    if(bctx)bctx.clearRect(0,0,width,height);if(fctx)fctx.clearRect(0,0,width,height);
  }
  function fallback(){cancelAnimationFrame(raf);raf=0;enabled=false;resetVisuals();}
  function startLoop(){last=0;if(!raf&&!disposed&&enabled&&!reduced.matches&&!forced.matches&&!document.hidden)raf=requestAnimationFrame(frame);}
  function preference(){
    if(reduced.matches||forced.matches){cancelAnimationFrame(raf);raf=0;intro=false;resetVisuals();}
    else if(initialized&&enabled){root.classList.add('vfx-ready');dirty=true;startLoop();}
  }
  function visibility(){
    if(document.hidden){cancelAnimationFrame(raf);raf=0;leave();for(const p of particles)p.life=0;pulses.length=0;intro=false;}
    else {dirty=true;startLoop();}
  }
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);raf=0;listeners.splice(0).forEach(fn=>fn());resizeObserver?.disconnect();mutationObserver?.disconnect();resetVisuals();
    for(const t of targets){t.el.classList.remove('vfx-reveal');delete t.el.dataset.vfxSurface;}
    for(const g of glyphs){g.el.classList.remove('vfx-glyph');g.el.removeAttribute('data-vfx-text');for(const k of ['--vfx-texture','--vfx-text-mask'])g.el.style.removeProperty(k);}
    for(const i of icons){i.el.classList.remove('vfx-icon');i.el.style.removeProperty('--vfx-icon-texture');}
    bg?.remove();fg?.remove();defsSvg?.remove();pulses.length=0;for(const p of particles)p.life=0;bgMesh=null;targets.length=0;glyphs.length=0;icons.length=0;
  }
  function getMetrics(){
    const summary=values=>{const a=values.filter(n=>Number.isFinite(n)).slice().sort((a,b)=>a-b);return a.length?{samples:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.ceil(a.length*.95)-1]}:null;};
    return {version:'9.0.0-r4',renderer:'Canvas2D + SVG alpha masks',enabled,disposed,reducedMotion:reduced.matches,frames:metrics.frames,fxMilliseconds:summary(metrics.samples),frameMilliseconds:summary(metrics.intervals),quality,particles:particles.filter(p=>p.life>0).length,pulses:pulses.length,pointerUps:metrics.pointerUps,pointerCancels:metrics.pointerCancels,impulses:metrics.impulses,layoutBuilds:metrics.layoutBuilds,backgroundVertices:bgMesh?.points.length||0,targetCount:targets.length,maskedTargets:targets.filter(t=>t.masked).map(t=>t.id),activeCard:activeCard?.id||null,error:metrics.error};
  }
  let resizeObserver,mutationObserver;
  window.MementoStartVFX=Object.freeze({config:CONFIG,dispose,getMetrics,setEnabled(value){enabled=!!value;if(enabled){preference();dirty=true;startLoop();}else fallback();},invalidateLayout(){dirty=true;}});
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
      start=performance.now()/1000;metrics.startedAt=start;register();measure();initialized=true;
      clearTimeout(window.__mementoVfxBootTimer);root.classList.remove('vfx-boot');root.classList.add('vfx-ready');
      listen(window,'pointermove',pointerMove,{passive:true});listen(window,'pointerdown',pointerDown,{passive:true});listen(window,'pointerup',e=>release(e),{passive:true});listen(window,'pointercancel',e=>release(e,true),{passive:true});
      listen(document.documentElement,'pointerleave',leave,{passive:true});listen(window,'blur',leave);listen(window,'resize',()=>{dirty=true;},{passive:true});
      listen(document,'visibilitychange',visibility);listen(reduced,'change',preference);listen(forced,'change',preference);
      listen(document,'focusin',e=>{focusCard=cardFromTarget(e.target);if(focusCard){css(focusCard.el,'--vfx-image','1');removeMask(focusCard);}dirty=true;});
      listen(document,'focusout',()=>{if(focusCard&&focusCard!==activeCard)css(focusCard.el,'--vfx-image','0');focusCard=null;dirty=true;});
      listen(window,'pagehide',e=>{if(e.persisted){cancelAnimationFrame(raf);raf=0;intro=false;}else dispose();});listen(window,'pageshow',e=>{if(e.persisted){intro=false;dirty=true;startLoop();}});
      listen(document.fonts,'loadingdone',()=>{dirty=true;});
      if('ResizeObserver'in window){resizeObserver=new ResizeObserver(()=>{dirty=true;});for(const t of targets)resizeObserver.observe(t.el);resizeObserver.observe(document.querySelector('main'));}
      mutationObserver=new MutationObserver(()=>{dirty=true;});mutationObserver.observe(document.querySelector('main'),{characterData:true,childList:true,subtree:true});
      preference();startLoop();
    }catch(error){metrics.error=String(error);fallback();console.warn('Memento VFX: readable fallback.',error);}
  }
  init();
})();
