/* Memento V2: open, document-anchored filament field. No emitter, listeners or RAF.
 * const env = MementoEnvironment({main,math:MementoFXMath});
 * Shared coordinator calls resize/render and destroy. Opaque DOM surfaces naturally
 * occlude this transparent canvas; their reveal masks also reveal the field behind.
 */
window.MementoEnvironment=function({main,math}){
 const {hash,smooth,clamp}=math,canvas=document.createElement('canvas');
 canvas.className='mm-vfx-environment';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',zIndex:'-1',pointerEvents:'none',contain:'strict'});
 main.prepend(canvas);
 const ctx=canvas.getContext('2d',{alpha:true});let W=0,H=0,dpr=1,dead=false,exclusions=[],graphKey='',graph=null;
 let stats={nodes:0,segments:0,particles:0,dpr:1,hidden:true};
 function resize(width,height){
  if(dead||!ctx)return;
  const ratio=Math.min(1.5,window.devicePixelRatio||1);
  if(W===width&&H===height&&dpr===ratio)return;
  W=Math.max(1,width);H=Math.max(1,height);dpr=ratio;
  canvas.width=Math.ceil(W*dpr);canvas.height=Math.ceil(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  const mainBox=main.getBoundingClientRect();
  exclusions=[...main.querySelectorAll('[data-mm-environment-owner], [data-environment="own"], [data-mm-environment="off"]')].map(n=>{
   const b=n.getBoundingClientRect();return {x:b.left-mainBox.left,y:b.top-mainBox.top,w:b.width,h:b.height};
  });
 }
 function render({width,height,scroll=0,pointer={},disabled=false,reduced=false,intro=false,light=false}){
  if(dead||!ctx)return stats;
  resize(width,height);
  if(disabled){canvas.style.display='none';stats={...stats,hidden:true};return stats;}
  canvas.style.display='';canvas.style.transform=`translateY(${scroll}px)`;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const mobile=W<600,maxNodes=mobile?160:420,maxEdges=mobile?400:1100;
  let cell=mobile?76:82,cols,rows;
  do{cols=Math.ceil(W/cell)+2;rows=Math.ceil(H/cell)+4;if(cols*rows>maxNodes)cell+=4;}while(cols*rows>maxNodes);
  const row0=Math.floor(scroll/cell)-1,points=[];
  const radius=pointer.touch||mobile?130:260,alpha=reduced||intro?0:clamp(pointer.alpha||0);
  const tension=reduced?0:mobile?.75:1.5;
  const contentHalf=Math.min(W*.4,640),margin=(W-contentHalf*2)/2;
  const gain=x=>.2+.8*(1-smooth(Math.max(0,margin-42),margin+66,Math.min(x,W-x)));
  const nextKey=[cell,cols,rows,row0,light].join(':');
  if(graphKey!==nextKey){
   graphKey=nextKey;graph={nodes:[],edges:[]};
   // Absolute row/column hashes keep topology identical after scroll reversal.
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const row=row0+j,key=row*73856093+i*19349663;
    graph.nodes.push({x:(i-.5)*cell+(hash(key+17)-.5)*cell*.78,y:(row+.5)*cell+(hash(key+71)-.5)*cell*.78,key});
   }
   const add=(a,b,key)=>{if(graph.edges.length<maxEdges&&hash(key+127)>.13)graph.edges.push([a,b]);};
   for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
    const a=j*cols+i,b=a+1,c=a+cols,d=c+1,key=graph.nodes[a].key;
    add(a,b,key);add(a,c,key+2);
    if(hash(key+29)>.24&&!light){if(hash(key+37)>.5)add(a,d,key+5);else add(b,c,key+5);}
   }
  }
  for(const node of graph.nodes){
   const {x,key}=node,y=node.y-scroll;
   const dx=x-(pointer.x??-9999),dy=y-(pointer.y??-9999),dist=Math.hypot(dx,dy);
   const influence=alpha*(1-smooth(0,radius,dist)),shift=tension*influence;
   points.push({x:x+dx/Math.max(1,dist)*shift,y:y+dy/Math.max(1,dist)*shift,key,gain:gain(x),influence});
  }
  const edges=graph.edges;
  const base=Array.from({length:5},()=>new Path2D()),warm=Array.from({length:6},()=>new Path2D());
  for(const [a,b] of edges){
   const p=points[a],q=points[b],g=(p.gain+q.gain)*.5;
   // Stable broad gaps soften the graph without periodic holes or isolated stars.
   const quiet=.45+.55*hash(Math.floor((p.key+q.key)/2)+271);
   const level=Math.max(0,Math.min(4,Math.round(g*quiet*4)));
   base[level].moveTo(p.x,p.y);base[level].lineTo(q.x,q.y);
   const activation=(p.influence+q.influence)*.5*g;
   if(activation>.025){const k=Math.min(5,Math.floor(activation*6));warm[k].moveTo(p.x,p.y);warm[k].lineTo(q.x,q.y);}
  }
  ctx.lineWidth=.65;ctx.lineCap='round';ctx.strokeStyle='#69615c';
  base.forEach((path,i)=>{ctx.globalAlpha=(.035+i*.038)*(intro?.35:1);ctx.stroke(path);});
  ctx.strokeStyle='#ff7950';ctx.lineWidth=.75;
  warm.forEach((path,i)=>{ctx.globalAlpha=.025+i*.047;ctx.stroke(path);});
  // Few quiet junctions belong to the same nodes as the wires. No white dots.
  ctx.fillStyle='#bc7957';
  for(const p of points)if(p.influence>.2&&hash(p.key+9)>.88){
   ctx.globalAlpha=p.influence*p.gain*.22;ctx.beginPath();ctx.arc(p.x,p.y,.65,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const b of exclusions)ctx.clearRect(b.x,b.y-scroll,b.w,b.h);
  stats={nodes:points.length,segments:edges.length,particles:0,dpr,hidden:false};return stats;
 }
 return {resize,render,get stats(){return {...stats};},destroy(){if(dead)return;dead=true;canvas.remove();exclusions=[];graph=null;}};
};
