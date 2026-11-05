/* Memento Start — shared SVG surface renderer. No framework, WebGL or per-card canvas.
 * SVG alpha masks control the real DOM. All decorative layers are aria-hidden.
 */
(()=>{
'use strict';
if(window.MementoVFX)return;
const C=window.MEMENTO_VFX_CONFIG,M=window.MementoFXMath,B=window.__MEMENTO_FX_BOOT__;
const Q=new URLSearchParams(location.search),debug=Q.get('fxdebug')==='1';let debugFrame=debug&&Q.has('fxintro')?Number(Q.get('fxintro')):null;
const root=document.documentElement,main=document.getElementById('memento-contact');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),forced=matchMedia('(forced-colors: active)');
if(!C||!M||!main){B?.restore();return;}
const {clamp,smooth,hash,field,phase,mesh}=M,NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},parent)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);parent?.append(n);return n;};
const set=(n,k,v)=>{if(n.getAttribute(k)!==String(v))n.setAttribute(k,v);};
const signalController=new AbortController(),signal=signalController.signal;
const on=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal});
let prepared=false;let owners=[],active=[],dirty=true,raf=0,lastTime=0,stopped=false,disabled=Q.get('fx')==='off'||!C.enabled;
let width=document.documentElement.clientWidth,height=innerHeight,scroll=scrollY,maxScroll=0,introStart=0,intro=false,interruptAt=0,interruptedP=0;
let count=0,lastScroll=-1,layoutFrames=0,slowFrames=0,quality='full';
let pointer={x:-1000,y:-1000,tx:-1000,ty:-1000,alpha:0,target:0,touch:false,first:true};
const metrics={version:'2.1.0',renderer:'shared-svg',frames:0,work:[],frameIntervals:[],cacheBuilds:0,layoutReads:0,maskWrites:0,particles:0};
const svg=el('svg',{class:'mm-vfx-overlay','aria-hidden':'true',focusable:'false',xmlns:NS});
const defs=el('defs',{},svg);
const navSvg=el('svg',{class:'mm-vfx-nav-overlay','aria-hidden':'true',focusable:'false',xmlns:NS});
const transitions=el('g',{},svg),trail=el('g',{},svg);
const trailBins=[.15,.30,.50,.80].map(opacity=>el('path',{fill:'#dd9552',stroke:'#f6be7a','stroke-width':.4,opacity},trail));
const cursorOuter=el('g',{},svg),cursorViewport=el('g',{},cursorOuter),cursorLayer=el('g',{},cursorViewport),navLayer=el('g',{},navSvg);
const radial=(id,r)=>{const g=el('radialGradient',{id,gradientUnits:'userSpaceOnUse',r},defs);for(const [offset,opacity] of [[0,1],[.15,1],[.5,.6],[.82,.13],[1,0]])el('stop',{offset,'stop-color':'white','stop-opacity':opacity},g);return g;};
const cursorGradient=radial('mm-fx-cursor',C.cursor.radius),navGradient=radial('mm-fx-nav-cursor',C.cursor.navRadius);
const makeFieldMask=(id,gradient)=>{const m=el('mask',{id,maskUnits:'userSpaceOnUse',x:-5000,y:-5000,width:10000,height:10000,'mask-type':'alpha'},defs);el('rect',{x:-5000,y:-5000,width:10000,height:10000,fill:`url(#${gradient})`},m);};
makeFieldMask('mm-fx-field-mask','mm-fx-cursor');makeFieldMask('mm-fx-nav-mask','mm-fx-nav-cursor');
cursorOuter.setAttribute('mask','url(#mm-fx-field-mask)');navLayer.setAttribute('mask','url(#mm-fx-nav-mask)');
// Each surface owns its reveal mask, including its cursor material.
const glow=el('filter',{id:'mm-fx-glow',x:'-12%',y:'-30%',width:'124%',height:'160%','color-interpolation-filters':'sRGB'},defs);
el('feGaussianBlur',{stdDeviation:C.material.glow},glow);
const amberFilter=el('filter',{id:'mm-fx-amber','color-interpolation-filters':'sRGB'},defs);
el('feColorMatrix',{type:'matrix',values:'0 0 0 0 1  0 0 0 0 .55  0 0 0 0 .20  0 0 0 .55 0'},amberFilter);
function pattern(id,size,faces,type=false){
 const p=el('pattern',{id,width:192,height:192,patternUnits:'userSpaceOnUse'},defs),edges=new Map();
 for(const t of mesh(192,192,size,55)){
  if(hash(t.x*17+t.y*3)<faces)el('path',{d:t.path,fill:type?'#ff985d':'#cd8059','fill-opacity':type?.20+hash(t.x*7+t.y)*.22:.07},p);
  for(let i=0;i<3;i++){const a=t.points[i],b=t.points[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');edges.set(key,`M${a.join(' ')}L${b.join(' ')}`);}
 }
 const d=[...edges.values()].join('');
 // Copper seams carry contrast on pale type; the fine lit rim sits beside them.
 if(type)el('path',{d,fill:'none',stroke:'#76442e','stroke-width':.85,'stroke-opacity':.46},p);
 el('path',{d,fill:'none',stroke:type?'#ffc69d':C.material.wire,'stroke-width':type?.60:.55,'stroke-opacity':type?.8:.48,transform:type?'translate(.35 .25)':''},p);
}
pattern('mm-fx-type',15,.16,true);pattern('mm-fx-small',8,0);pattern('mm-fx-edge',16,.018);pattern('mm-fx-micro',8,0);
const meter=document.createElement('output');meter.id='mm-fx-metrics';meter.hidden=true;
if(debug)document.body.append(meter);
document.body.append(svg,navSvg);
const environment=window.MementoEnvironment?.({main,math:M});
const canvas=document.createElement('canvas'),measure=canvas.getContext('2d');
const fontMetrics=new Map();
function fontInfo(style){
 const key=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
 if(!fontMetrics.has(key)){measure.font=key;const m=measure.measureText('Hg');fontMetrics.set(key,{font:key,ascent:m.fontBoundingBoxAscent||parseFloat(style.fontSize)*.96,descent:m.fontBoundingBoxDescent||parseFloat(style.fontSize)*.25});}
 return fontMetrics.get(key);
}
function textShape(node,origin){
 const group=el('g');const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){
  if(!n.textContent.trim()||n.parentElement.closest('.icon,[aria-hidden=true]'))continue;
  if(n.parentElement!==node&&n.parentElement.closest('[data-mm-type]')!==node)continue;
  const parent=n.parentElement,style=getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden')continue;
  const range=document.createRange(),lines=new Map(),fm=fontInfo(style);
  for(let i=0;i<n.length;i++){
   range.setStart(n,i);range.setEnd(n,i+1);const b=range.getBoundingClientRect();
   if(!b.width||!b.height)continue;
   const key=Math.round(b.top*4)/4;
   if(!lines.has(key))lines.set(key,{text:'',xs:[],y:b.top-origin.top+(b.height-fm.ascent-fm.descent)/2+fm.ascent});
   const l=lines.get(key);l.text+=style.textTransform==='uppercase'?n.textContent[i].toUpperCase():n.textContent[i];l.xs.push(+(b.left-origin.left).toFixed(3));
  }
  for(const l of lines.values()){
   const text=el('text',{x:l.xs.join(' '),y:l.y,'font-family':style.fontFamily,'font-size':style.fontSize,'font-weight':style.fontWeight,'font-style':style.fontStyle,'letter-spacing':0,'font-kerning':'none','font-optical-sizing':style.fontOpticalSizing||'auto','xml:space':'preserve'},group);text.textContent=l.text;
  }
 }
 return group;
}
const iconCache=new Map();
function iconURL(node){const u=getComputedStyle(node).getPropertyValue('--icon').match(/url\(["']?(.*?)["']?\)/);return u?new URL(u[1],new URL('assets/start.css',location.href)).href:null;}
for(const [name,source] of Object.entries(window.MEMENTO_FX_ICONS||{}))iconCache.set(name,new DOMParser().parseFromString(source,'image/svg+xml').documentElement);
function iconShape(node,origin){
 const source=iconCache.get(window.MEMENTO_FX_ICON_NAMES?.[[...node.classList].find(c=>window.MEMENTO_FX_ICON_NAMES[c])]||iconURL(node)?.split('/').pop());if(!source)return null;
 const b=node.getBoundingClientRect(),style=getComputedStyle(node);if(!b.width||style.display==='none')return null;
 const v=(source.getAttribute('viewBox')||'0 0 24 24').split(/\s+/).map(Number),size=Math.min(b.width/v[2],b.height/v[3]);
 const outer=el('g',{transform:`translate(${b.left-origin.left+b.width/2} ${b.top-origin.top+b.height/2})`});
 // Card chevrons are the original -135 degree rotated icon. No geometry changes.
 const rotation=node.classList.contains('card-chevron')?'rotate(-135) ':'';
 const g=el('g',{transform:`${rotation}scale(${size}) translate(${-v[2]/2-v[0]} ${-v[3]/2-v[1]})`,fill:source.getAttribute('fill')||'none',stroke:'currentColor','stroke-width':source.getAttribute('stroke-width')||2,'stroke-linecap':'round','stroke-linejoin':'round'},outer);
 for(const child of source.children)g.append(child.cloneNode(true));return outer;
}
function cardPath(owner,inset=0){
 const {w,h,cut}=owner,k=Math.max(0,cut-inset*.586),l=inset,r=w-inset,b=h-inset;
 if(owner.nav){const rad=Math.max(1,10-inset);return `M${l+rad} ${l}H${r-rad}Q${r} ${l} ${r} ${l+rad}V${b-rad}Q${r} ${b} ${r-rad} ${b}H${l+rad}Q${l} ${b} ${l} ${b-rad}V${l+rad}Q${l} ${l} ${l+rad} ${l}Z`;}
 return `M${l+k} ${l}H${r}V${owner.map?b:b-k}${owner.map?'':`L${r-k} ${b}`}H${l}V${l+k}Z`;
}
const typeSelector='.hero-line,.contact-title,.faq-title,.faq-item summary,.faq-answer p,.section-heading,.location-address,.location-address>span,.hours dt,.hours dd,.board-title,.legal-group h3,.legal-group p,.legal-group a,.legal-group button,.explore-words>span';
function register(){
 main.querySelectorAll(typeSelector).forEach(n=>n.dataset.mmType='');
 const nodes=[...main.querySelectorAll('.hero-title,.cut-frame,.section-heading,.explore-link')].filter(n=>!n.closest('dialog'));
 for(const node of nodes){
  node.dataset.mmMask='';
  owners.push({node,id:++count,nav:false,card:node.classList.contains('cut-frame'),map:node.classList.contains('location-map'),seed:count*631,built:false,visible:false});
 }
 const nav=document.querySelector('memento-nav');
 if(nav?.shadowRoot){for(const n of nav.shadowRoot.querySelectorAll('.mm-tile'))owners.push({node:n,id:++count,nav:true,card:true,map:false,seed:count*631,built:false,visible:false});}
 for(const o of owners)observer.observe(o.node);
 dirty=true;
}
function release(o){
 o.node.style.removeProperty('mask-image');o.node.style.removeProperty('-webkit-mask-image');o.node.style.removeProperty('pointer-events');
 for(const key of ['mask','clip','cursor','transition','bandClip'])o[key]?.remove();
 o.cells=null;o.edges=null;o.edgeBins=null;o.built=false;o.lastMask=null;
}
function build(o,b){
 release(o);metrics.cacheBuilds++;
 // Build detached: SVG writes must not invalidate layout before DOM text measurements.
 const ownerDefs=document.createDocumentFragment();
 const cs=getComputedStyle(o.node);o.w=b.width;o.h=b.height;o.cut=parseFloat(cs.clipPath.match(/polygon\(([^ ,]+)/)?.[1])||0;
 o.clip=el(o.card?'clipPath':'mask',{id:`mm-fx-shape-${o.id}`,clipPathUnits:'userSpaceOnUse',maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:-10,y:-10,width:o.w+20,height:o.h+20,'mask-type':'alpha'},ownerDefs);
 o.cursor=el('g');
 o.transition=el('g',{[o.card?'clip-path':'mask']:`url(#mm-fx-shape-${o.id})`});
 o.wires=[.18,.42,.75,1].map(op=>el('path',{fill:'none',stroke:C.material.wire,'stroke-width':.58,opacity:op*.32},o.transition));
 const local={left:b.left,top:b.top};
 if(o.card){
  const path=cardPath(o);el('path',{d:path},o.clip);
  o.bandClip=el('clipPath',{id:`mm-fx-band-${o.id}`,clipPathUnits:'userSpaceOnUse'},ownerDefs);
  el('path',{d:path+cardPath(o,o.nav?3.5:8),'clip-rule':'evenodd','fill-rule':'evenodd'},o.bandClip);
  const clip=el('g',{'clip-path':`url(#mm-fx-shape-${o.id})`},o.cursor);
  const glowBorder=el('path',{d:path,fill:'none',stroke:'#ff9855','stroke-width':o.nav?1.4:1.7,filter:'url(#mm-fx-glow)',opacity:.24},clip);glowBorder.dataset.fxHalo='';
  const band=el('g',{'clip-path':`url(#mm-fx-band-${o.id})`},clip);
  const borderEdges=new Map();
  for(const t of mesh(o.w,o.h,o.nav?9:19,o.seed+31,16)){
   if(t.x>16&&t.x<o.w-16&&t.y>16&&t.y<o.h-16)continue;
   for(let i=0;i<3;i++){const a=t.points[i],b=t.points[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');borderEdges.set(key,`M${a.join(' ')}L${b.join(' ')}`);}
  }
  el('path',{d:[...borderEdges.values()].join(''),fill:'none',stroke:'#c38768','stroke-width':.55,opacity:o.nav?.26:.42},band);
  el('path',{d:cardPath(o,.6),fill:'none',stroke:'#df956a','stroke-width':.6,opacity:.55},clip);
  if(o.nav){
   const s=o.node.querySelector('svg');if(s){const copy=s.cloneNode(true);copy.removeAttribute('class');copy.setAttribute('x',3);copy.setAttribute('y',3);copy.setAttribute('width',34);copy.setAttribute('height',34);copy.setAttribute('filter','url(#mm-fx-amber)');copy.setAttribute('opacity','.12');clip.append(copy);}
  }
 }
 const types=[...(o.node.matches('[data-mm-type]')?[o.node]:[]),...o.node.querySelectorAll('[data-mm-type]')];
 for(const n of types){
  if(n.closest('details')&&!n.closest('details').open&&!n.matches('summary'))continue;
  const shape=textShape(n,local);if(!shape.childElementCount)continue;
  const fs=parseFloat(getComputedStyle(n).fontSize),small=fs<38,clipId=`mm-fx-type-${o.id}-${count++}`;
  const clip=el('clipPath',{id:clipId},o.clip); // moved below: separate defs, owned by clip subtree for cleanup
  for(const text of shape.children)clip.append(text.cloneNode(true));o.clip.removeChild(clip); // no nested clipPath in a clipping silhouette
  // Store local text clipping in the cursor group so release removes it with the owner.
  o.cursor.append(clip);
  if(!o.card)for(const text of shape.children)o.clip.append(text.cloneNode(true));
  const all=el('g',{},o.cursor);
  if(!small&&quality==='full'){
   const soft=shape.cloneNode(true);soft.setAttribute('fill','none');soft.setAttribute('stroke','#ff923c');soft.setAttribute('stroke-width','1.1');soft.setAttribute('filter','url(#mm-fx-glow)');soft.setAttribute('opacity','.36');soft.dataset.fxHalo='';all.append(soft);
  }
  el('rect',{width:o.w,height:o.h,fill:'#ff9b4f',opacity:small?.035:.035,'clip-path':`url(#${clipId})`},all);
  el('rect',{width:o.w,height:o.h,fill:`url(#mm-fx-${small?'small':'type'})`,opacity:small?.06:1,'clip-path':`url(#${clipId})`},all);
  const edge=shape.cloneNode(true);edge.setAttribute('fill','none');edge.setAttribute('stroke',C.material.edge);edge.setAttribute('stroke-width',small?.24:C.material.edgeWidth);edge.setAttribute('opacity',small?.38:.75);edge.setAttribute('stroke-linejoin','round');all.append(edge);
 }
 if(!o.nav){
  for(const n of o.node.querySelectorAll('.icon')){
   const shape=iconShape(n,local);if(!shape)continue;
   shape.setAttribute('color','#ffb976');shape.setAttribute('opacity','.85');o.cursor.append(shape);
   if(!o.card){const copy=shape.cloneNode(true);copy.setAttribute('stroke','black');copy.setAttribute('color','black');o.clip.append(copy);}
  }
  if(o.card){for(const n of o.node.querySelectorAll('.faq-item:not(:last-child)')){
   const rb=n.getBoundingClientRect();el('path',{d:`M${rb.left-b.left} ${rb.bottom-b.top}h${rb.width}`,stroke:'#ffad64','stroke-width':.7,opacity:.6},o.cursor);
  }}
 }
 if(!o.nav){
  const size=Math.max(width<600?C.transition.mobileCell:C.transition.cell,Math.sqrt(o.w*o.h*2/C.quality.maxCellsPerOwner));
  o.cells=mesh(o.w,o.h,size,o.seed);
  const topology=new Map();o.edges=[];
  for(const c of o.cells){c.edges=[];for(let i=0;i<3;i++){const a=c.points[i],b=c.points[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');if(!topology.has(key)){topology.set(key,o.edges.length);o.edges.push(`M${a.join(' ')}L${b.join(' ')}`);}c.edges.push(topology.get(key));}}
  o.edgeBins=new Int8Array(o.edges.length);
  o.mask=el('mask',{id:`mm-fx-material-${o.id}`,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:-2,y:-2,width:o.w+4,height:o.h+4,'mask-type':'alpha'},ownerDefs);
  // One path per alpha level, rather than a DOM element per triangle.
  // The same seeded triangles are preserved; scroll updates at most 24 paths per surface.
  o.maskBins=Array.from({length:24},(_,i)=>el('path',{fill:'white',stroke:'white','stroke-width':.7,'stroke-linejoin':'round',opacity:(i+1)/24,d:i===23?o.cells.map(c=>c.path).join(''):''},o.mask));
  markGlyphCells(o);
 }
 defs.append(ownerDefs);(o.nav?navLayer:cursorLayer).append(o.cursor);transitions.append(o.transition);
 o.built=true;o.rebuild=false;o.lastMask=null;
}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const o=owners.find(x=>x.node===entry.target);if(o)o.visible=entry.isIntersecting;}schedule();},{rootMargin:'220px'});
function layout(){
 width=document.documentElement.clientWidth;height=visualViewport?.height||innerHeight;scroll=clamp(scrollY,0,Math.max(0,document.documentElement.scrollHeight-height));maxScroll=Math.max(0,document.documentElement.scrollHeight-height);
 environment?.resize(width,height);
 svg.setAttribute('viewBox',`0 0 ${width} ${innerHeight}`);navSvg.setAttribute('viewBox',`0 0 ${width} ${innerHeight}`);
 const reads=owners.map(o=>({o,b:o.node.getBoundingClientRect(),hidden:o.nav&&!!o.node.getRootNode().host?.hidden}));metrics.layoutReads+=reads.length;
 active=[];
 for(const {o,b,hidden} of reads){
  o.x=b.left;o.y=b.top+(o.nav?0:scroll);o.hidden=hidden;o.visible=!hidden&&b.width>0&&b.height>0&&b.bottom>-220&&b.top<height+220;
  if(!o.visible){if(o.built&&(o.rebuild||Math.abs(o.w-b.width)>.1||Math.abs(o.h-b.height)>.1))release(o);o.w=b.width;o.h=b.height;if(o.cursor)o.cursor.style.display='none';if(o.transition)o.transition.style.display='none';continue;}
  const signature=[b.width.toFixed(2),b.height.toFixed(2),o.node.textContent,o.node.querySelector('details[open]')?.dataset.faq||''].join('|');
  if(!o.built||o.signature!==signature||o.rebuild){build(o,b);o.signature=signature;o.rebuild=false;}
  active.push(o);
 }
 const cached=owners.filter(o=>o.built&&!o.visible);if(cached.length>C.quality.maxCachedOwners)cached.slice(0,cached.length-C.quality.maxCachedOwners).forEach(release);
 dirty=false;
}
function protectedOwner(o){
 const a=document.activeElement;if(a&&a!==document.body&&o.node.contains(a))return true;
 const selection=getSelection();if(selection&&!selection.isCollapsed&&selection.anchorNode&&o.node.contains(selection.anchorNode))return true;
 if(location.hash){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return false;}const target=document.getElementById(id);return target&&(o.node.contains(target)||target.contains(o.node));}return false;
}
function loadProgress(x,y,now){
 const elapsed=debugFrame!==null?debugFrame:now-introStart;
 const spatial=clamp((x/width)*.34+(1-y/height)*.46);
 let p=smooth(30+spatial*130,580+spatial*280,elapsed);
 if(interruptAt)p=p+(1-p)*smooth(0,C.transition.interrupt,now-interruptAt);
 return p;
}
function progress(o,c,now,protect){
 if(protect)return 1;
 const y=o.y-scroll+c.y;
 // Use the actual child scroll root. A parent-sized iframe with no own scroll has both gates open.
 let p=field(y,height,scroll,maxScroll,C.transition);
 if(intro)p=Math.min(p,loadProgress(o.x+c.x,y,now));
 return p;
}
let particlePaths=[];
const glyphCanvas=document.createElement('canvas'),glyphContext=glyphCanvas.getContext('2d',{willReadFrequently:true});
function markGlyphCells(o){
 if(o.card)return;const scale=.5;glyphCanvas.width=Math.ceil(o.w*scale);glyphCanvas.height=Math.ceil(o.h*scale);glyphContext.setTransform(scale,0,0,scale,0,0);glyphContext.fillStyle='#fff';
 for(const t of o.clip.querySelectorAll('text')){glyphContext.font=`${t.getAttribute('font-style')} ${t.getAttribute('font-weight')} ${t.getAttribute('font-size')} ${t.getAttribute('font-family')}`;const xs=t.getAttribute('x').split(' ').map(Number),y=+t.getAttribute('y');[...t.textContent].forEach((ch,i)=>glyphContext.fillText(ch,xs[i],y));}
 const data=glyphContext.getImageData(0,0,glyphCanvas.width,glyphCanvas.height).data,w=glyphCanvas.width,h=glyphCanvas.height;
 const sample=(x,y)=>data[(Math.min(h-1,Math.max(0,Math.floor(y*scale)))*w+Math.min(w-1,Math.max(0,Math.floor(x*scale))))*4+3]>20;
 for(const c of o.cells)c.ink=sample(c.x,c.y)||c.points.some(p=>sample(p[0],p[1]));
}
function updateMaterial(o,now){
 const protect=protectedOwner(o),top=o.y-scroll,bottom=top+o.h;
 const full=!intro&&(protect||Math.min(field(top,height,scroll,maxScroll,C.transition),field(bottom,height,scroll,maxScroll,C.transition))>.999);
 const visibility=bottom>0&&top<height;
 if(full){
  if(o.lastMask!=='full'){o.node.style.removeProperty('mask-image');o.node.style.removeProperty('-webkit-mask-image');o.node.style.removeProperty('pointer-events');o.cursor.removeAttribute('mask');o.lastMask='full';}
  o.transition.style.display='none';o.particles=[];return;
 }
 if(!visibility&&!intro){o.transition.style.display='none';o.particles=[];return;}
 const value=`url("#mm-fx-material-${o.id}")`;
 if(o.lastMask!=='partial'){o.node.style.maskImage=value;o.node.style.webkitMaskImage=value;o.cursor.setAttribute('mask',`url(#mm-fx-material-${o.id})`);o.lastMask='partial';}
 o.transition.style.display='';
 o.particles=[];
 const paths=['','','',''],maskPaths=Array(24).fill('');let anyFill=false;
 const cap=width<600?C.transition.mobileParticles:C.transition.particles;
 o.edgeBins.fill(-1);
 for(const c of o.cells){
  const p=progress(o,c,now,protect),state=phase(p,c.h),level=Math.round(state.fill*24),a=level/24;
  if(level)maskPaths[level-1]+=c.path;
  anyFill=anyFill||a>.02;
  const gain=(top+c.y<height*.2?C.transition.exitGain:1),front=width<600?24:38, distance=(p-.36)*height*(top+c.y<height*.2?.115:.14), wire=state.wire*gain*(1-smooth(front*.25,front,Math.abs(distance)));
  if(wire>.035){const bin=Math.min(3,Math.floor(wire*4));for(const id of c.edges)if(o.edgeBins[id]<bin)o.edgeBins[id]=bin;}
  if(state.trail>.06&&(o.card||c.ink)&&c.h>.90&&particlePaths.length+o.particles.length<cap){
   const size=1.1+hash(c.x+c.y*17)*3.1,drift=(1-p)*24;
   const x=o.x+c.x+Math.sin(c.h*22)*drift,y=top+c.y+(top+c.y<height*.2?-drift:drift);
   o.particles.push({bin:Math.min(3,Math.floor(state.trail*gain*4)),d:`M${x.toFixed(1)} ${y.toFixed(1)}l${size.toFixed(1)} ${(size*1.7).toFixed(1)}l${(-size*2).toFixed(1)} 0Z`});
  }
 }
 for(let i=0;i<o.edges.length;i++)if(o.edgeBins[i]>=0)paths[o.edgeBins[i]]+=o.edges[i];
 o.maskBins.forEach((n,i)=>{if(n.getAttribute('d')!==maskPaths[i]){n.setAttribute('d',maskPaths[i]);metrics.maskWrites++;}});
 o.wires.forEach((n,i)=>set(n,'d',paths[i]));
 particlePaths.push(...o.particles);o.node.style.pointerEvents=anyFill?'':'none';
}
function publishMetrics(){
 if(!debug)return;
 const stats=a=>{const sorted=[...a].sort((a,b)=>a-b);return {median:+(sorted[Math.floor(sorted.length*.5)]||0).toFixed(3),p95:+(sorted[Math.floor(sorted.length*.95)]||0).toFixed(3)};};
 meter.textContent=JSON.stringify({...metrics,browser:navigator.userAgent,work:stats(metrics.work),frameIntervals:stats(metrics.frameIntervals),viewport:[width,height],dpr:devicePixelRatio,quality,owners:owners.length,active:active.length,intro,disabled,rafPending:!!raf});
}
function restore(){
 intro=false;B?.restore();clearTimeout(B?.preparation);clearTimeout(B?.deadline);
 for(const o of owners){o.node.style.removeProperty('mask-image');o.node.style.removeProperty('-webkit-mask-image');o.node.style.removeProperty('pointer-events');o.lastMask=null;}
}
function finishIntro(){intro=false;lastScroll=-1;B.pending=false;clearTimeout(B.deadline);root.classList.remove('mm-fx-pending');}
function frame(now){
 raf=0;if(stopped)return;
 const begin=performance.now(),rawDt=lastTime?now-lastTime:16.7,dt=Math.min(64,rawDt);lastTime=now;
 if(document.hidden||root.dataset.mementoActive==='false'){environment?.render({width,height,scroll,pointer,disabled:true});svg.style.display=navSvg.style.display='none';pointer.target=0;pointer.alpha=0;return;}
 if(disabled||reduced.matches||forced.matches){scroll=scrollY;width=document.documentElement.clientWidth;height=innerHeight;restore();metrics.environment=environment?.render({width,height,scroll,pointer,disabled:disabled||forced.matches,reduced:reduced.matches});svg.style.display=navSvg.style.display='none';publishMetrics();return;}
 svg.style.display=navSvg.style.display='';
 try{
  scroll=clamp(scrollY,0,Math.max(0,document.documentElement.scrollHeight-height));
  let refreshed=false;if(dirty||layoutFrames>0){refreshed=true;layout();layoutFrames=Math.max(0,layoutFrames-1);}
  else if(scroll!==lastScroll){active=[];for(const o of owners){const y=o.y-(o.nav?0:scroll);o.visible=!o.hidden&&o.w>0&&y+o.h>-220&&y<height+220;if(o.visible){if(!o.built||o.rebuild)build(o,{left:o.x,top:y,width:o.w,height:o.h});active.push(o);}else{if(o.cursor)o.cursor.style.display='none';if(o.transition)o.transition.style.display='none';}}}
  if(intro&&debugFrame===null&&((!interruptAt&&now-introStart>=C.transition.intro)||(interruptAt&&now-interruptAt>=C.transition.interrupt)))finishIntro();
  if(debug&&Q.has('fxpointer')){const p=Q.get('fxpointer').split(',').map(Number);pointer.tx=p[0];pointer.ty=p[1];pointer.target=1;}
  const follow=1-Math.exp(-dt/C.cursor.follow),fade=1-Math.exp(-dt/((pointer.target?C.cursor.attack:C.cursor.release)/4));
  pointer.x+=(pointer.tx-pointer.x)*follow;pointer.y+=(pointer.ty-pointer.y)*follow;pointer.alpha+=(pointer.target-pointer.alpha)*fade;
  if(Math.abs(pointer.alpha-pointer.target)<.002)pointer.alpha=pointer.target;
  const radius=pointer.touch||width<600?C.cursor.touchRadius:C.cursor.radius;
  for(const [gradient,r] of [[cursorGradient,radius],[navGradient,C.cursor.navRadius]]){set(gradient,'cx',pointer.x);set(gradient,'cy',pointer.y);set(gradient,'r',r);}
  set(cursorOuter,'opacity',pointer.alpha);set(navLayer,'opacity',pointer.alpha);

  particlePaths=[];
  for(const o of active){
   const y=o.y-(o.nav?0:scroll),transform=`translate(${o.x} ${y})`;
   set(o.cursor,'transform',transform);set(o.transition,'transform',transform);
   if(!o.nav){if(intro||scroll!==lastScroll||o.lastMask===null||refreshed)updateMaterial(o,now);else particlePaths.push(...(o.particles||[]));}
   const r=o.nav?C.cursor.navRadius:radius,dx=Math.max(o.x-pointer.x,0,pointer.x-o.x-o.w),dy=Math.max(y-pointer.y,0,pointer.y-y-o.h);
   o.cursor.style.display=pointer.alpha>.001&&Math.hypot(dx,dy)<r&&!o.hidden?'':'none';
  }
  particlePaths=particlePaths.slice(0,width<600?C.transition.mobileParticles:C.transition.particles);
  trailBins.forEach((n,i)=>set(n,'d',particlePaths.filter(p=>p.bin===i).map(p=>p.d).join('')));metrics.particles=particlePaths.length;
  metrics.environment=environment?.render({width,height,scroll,pointer,disabled:false,reduced:false,intro,light:quality==='light'});
  metrics.frames++;
  const cost=performance.now()-begin;
  if(debug){metrics.work.push(cost);if(metrics.work.length>900)metrics.work.shift();if(rawDt>1){metrics.frameIntervals.push(rawDt);if(metrics.frameIntervals.length>900)metrics.frameIntervals.shift();}publishMetrics();}
  if(cost>C.quality.slowFrame)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
  if(slowFrames>30&&quality==='full'){quality='light';svg.querySelectorAll('[data-fx-halo]').forEach(n=>n.style.display='none');navSvg.querySelectorAll('[data-fx-halo]').forEach(n=>n.style.display='none');slowFrames=0;}
  const moving=Math.abs(pointer.x-pointer.tx)+Math.abs(pointer.y-pointer.ty)>.12||pointer.alpha!==pointer.target;
  if((intro&&debugFrame===null)||moving||layoutFrames>0)schedule();
  lastScroll=scroll;
 }catch(error){console.error('Memento VFX: fallback leggibile',error);restore();disabled=true;environment?.render({width,height,scroll,pointer,disabled:true});svg.style.display=navSvg.style.display='none';publishMetrics();}
}
function schedule(){if(!prepared)return;if(!raf&&!stopped)raf=requestAnimationFrame(frame);}
function invalidate(rebuild=false){dirty=true;if(rebuild)for(const o of owners)o.rebuild=true;schedule();}
function interrupt(){if(intro&&!interruptAt){interruptAt=performance.now();schedule();}}
on(window,'scroll',()=>{interrupt();schedule();},{passive:true});
on(window,'resize',()=>invalidate(true),{passive:true});
on(window.visualViewport||window,'resize',()=>invalidate(true),{passive:true});
on(main,'click',e=>{
 if(disabled||reduced.matches||!e.detail)return;const o=owners.find(o=>!o.nav&&o.lastMask==='partial'&&o.node.contains(e.target));if(!o?.cells)return;
 const x=e.clientX-o.x,y=e.clientY-o.y+scroll;
 const inside=t=>{const [a,b,c]=t.points;const cross=(a,b)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);const d=[cross(a,b),cross(b,c),cross(c,a)];return d.every(v=>v>=0)||d.every(v=>v<=0);};
 const cell=o.cells.find(inside);if(cell&&phase(progress(o,cell,performance.now(),protectedOwner(o)),cell.h).fill<.08){e.preventDefault();e.stopImmediatePropagation();}
},{capture:true});
on(document,'pointermove',e=>{
 if(!e.isPrimary)return;pointer.touch=e.pointerType==='touch';if(pointer.touch&&!e.buttons)return;
 pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.target=1;
 if(pointer.first){pointer.x=e.clientX;pointer.y=e.clientY;pointer.first=false;}
 schedule();
},{passive:true});
on(document,'pointerdown',e=>{if(!e.isPrimary)return;pointer.touch=e.pointerType==='touch';pointer.tx=pointer.x=e.clientX;pointer.ty=pointer.y=e.clientY;pointer.target=1;pointer.first=false;schedule();},{passive:true});
const leave=()=>{pointer.target=0;pointer.first=true;schedule();};
on(document,'pointerup',e=>{if(e.pointerType!=='mouse')leave();},{passive:true});on(document,'pointercancel',leave,{passive:true});
on(document,'pointerout',e=>{if(!e.relatedTarget)leave();},{passive:true});on(window,'blur',leave);
on(document,'focusin',e=>{
 interrupt();const target=e.composedPath()[0];if(target.matches?.(':focus-visible')){const b=target.getBoundingClientRect();pointer.tx=pointer.x=b.left+b.width/2;pointer.ty=pointer.y=b.top+b.height/2;pointer.target=.7;}invalidate();
});
on(document,'focusout',()=>{leave();invalidate();});
on(document,'selectionchange',()=>invalidate());
on(document,'toggle',e=>{if(e.target.matches?.('details,dialog')){for(const o of owners)if(o.node.contains(e.target))o.rebuild=true;layoutFrames=1;invalidate();}}, {capture:true});
on(document,'memento:typography',()=>invalidate(true));on(document,'memento:overlay-change',()=>{leave();invalidate(true);});
on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;pointer.target=pointer.alpha=0;environment?.render({width,height,scroll,pointer,disabled:true});}else{intro=false;invalidate();}});
on(window,'pageshow',e=>{if(e.persisted){restore();invalidate(true);}});
on(window,'hashchange',()=>{restore();invalidate();});
on(document,'keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){restore();disabled=true;schedule();}});
on(reduced,'change',()=>{restore();invalidate(true);});on(forced,'change',()=>{restore();invalidate(true);});
on(document.fonts,'loadingdone',()=>{if(prepared&&performance.now()-introStart>1500){fontMetrics.clear();invalidate(true);}});
const resizeObserver=new ResizeObserver(()=>invalidate());resizeObserver.observe(main);
const contentObserver=new MutationObserver(changes=>{if(changes.some(c=>!c.target.closest?.('svg.mm-vfx-overlay')&&(c.type==='characterData'||c.type==='childList'))){invalidate(true);}});
contentObserver.observe(main,{subtree:true,childList:true,characterData:true});
// Late-mounted, open shadow navbar: same field and renderer, with final per-box clipping.
const navObserver=new MutationObserver(()=>{const nav=document.querySelector('memento-nav');if(nav?.shadowRoot&&!owners.some(o=>o.nav)){for(const n of nav.shadowRoot.querySelectorAll('.mm-tile')){const o={node:n,id:++count,nav:true,card:true,seed:count*631};owners.push(o);observer.observe(n);}invalidate();}});
navObserver.observe(document.body,{childList:true});
window.MementoVFX={
 version:'2.1.0',config:C,resetMetrics(){metrics.work=[];metrics.frameIntervals=[];metrics.frames=0;metrics.maskWrites=0;metrics.cacheBuilds=0;metrics.layoutReads=0;lastTime=0;},setIntroFrame(value){if(!debug)return;restore();debugFrame=value;intro=value!==null;introStart=performance.now();interruptAt=0;lastScroll=-1;disabled=false;schedule();},get state(){return {quality,intro,disabled,owners:owners.length,active:active.length,pointer:{...pointer},metrics};},
 setEnabled(value){disabled=!value;restore();invalidate();},refresh(){invalidate(true);},
 destroy(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);restore();signalController.abort();observer.disconnect();resizeObserver.disconnect();contentObserver.disconnect();navObserver.disconnect();owners.forEach(release);owners=[];environment?.destroy();svg.remove();navSvg.remove();meter.remove();delete window.MementoVFX;}
};
B.abort=()=>{if(intro){restore();lastScroll=-1;schedule();}};
register();
if(debug&&Q.has('fxpointer')){const [x,y]=Q.get('fxpointer').split(',').map(Number);if(Number.isFinite(x)&&Number.isFinite(y)){pointer.x=pointer.tx=x;pointer.y=pointer.ty=y;pointer.alpha=pointer.target=1;pointer.first=false;}}
// Font preparation is bounded by boot.js; a late renderer never hides visible content again.
document.fonts.ready.then(()=>{
 prepared=true;const eligible=B.pending&&!B.expired&&!disabled&&!reduced.matches&&!forced.matches;
 if(eligible||(debugFrame!==null)){intro=true;introStart=performance.now();}
 dirty=true;cancelAnimationFrame(raf);raf=0;frame(performance.now());
 B.pending=false;clearTimeout(B.preparation);root.classList.remove('mm-fx-pending');
 if(!intro||(debugFrame!==null))clearTimeout(B.deadline);

});
if(!B.pending)schedule();
})();
