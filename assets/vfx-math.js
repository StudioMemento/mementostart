/* Memento R4 — pure, deterministic geometry. No DOM or animation loop. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = (a, b, x) => { const t = clamp((x - a) / Math.max(.00001, b - a)); return t * t * (3 - 2 * t); };
  const hash = str => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const random = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const polygon = (w, h, c, map = false) => map ? [[c,0],[w,0],[w,h],[0,h],[0,c]] : [[c,0],[w,0],[w,h-c],[w-c,h],[0,h],[0,c]];
  function inside(x, y, poly) {
    let inPoly = false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const a=poly[i],b=poly[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inPoly=!inPoly;
    }
    return inPoly;
  }
  function nearest(x,y,poly) {
    let best={distance:Infinity,x:0,y:0,arc:0},arc=0;
    for(let i=0;i<poly.length;i++) {
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(length*length||1)),px=a[0]+t*dx,py=a[1]+t*dy,d=Math.hypot(x-px,y-py);
      if(d<best.distance) best={distance:d,x:px,y:py,arc:arc+t*length};
      arc+=length;
    }
    best.perimeter=arc; return best;
  }
  function triangulate(points) {
    if(points.length<3) return [];
    const p=points.map(v=>[v[0],v[1]]),n=p.length;
    let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
    for(const a of p){minx=Math.min(minx,a[0]);maxx=Math.max(maxx,a[0]);miny=Math.min(miny,a[1]);maxy=Math.max(maxy,a[1]);}
    const d=Math.max(maxx-minx,maxy-miny,1)*20,cx=(minx+maxx)/2,cy=(miny+maxy)/2;
    p.push([cx-d,cy-d],[cx,cy+d],[cx+d,cy-d]);
    function tri(a,b,c){
      const A=p[a],B=p[b],C=p[c],q=2*(A[0]*(B[1]-C[1])+B[0]*(C[1]-A[1])+C[0]*(A[1]-B[1]));
      if(Math.abs(q)<1e-8) return null;
      const aa=A[0]*A[0]+A[1]*A[1],bb=B[0]*B[0]+B[1]*B[1],cc=C[0]*C[0]+C[1]*C[1];
      const x=(aa*(B[1]-C[1])+bb*(C[1]-A[1])+cc*(A[1]-B[1]))/q,y=(aa*(C[0]-B[0])+bb*(A[0]-C[0])+cc*(B[0]-A[0]))/q;
      return {a,b,c,x,y,r:(x-A[0])**2+(y-A[1])**2};
    }
    let triangles=[tri(n,n+1,n+2)];
    for(let i=0;i<n;i++) {
      const boundary=new Map(),keep=[];
      for(const t of triangles){
        if((p[i][0]-t.x)**2+(p[i][1]-t.y)**2<=t.r+1e-7) {
          for(const [a,b] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]) {const k=a<b?`${a}:${b}`:`${b}:${a}`;if(boundary.has(k))boundary.delete(k);else boundary.set(k,[a,b]);}
        } else keep.push(t);
      }
      for(const [a,b] of boundary.values()){const t=tri(a,b,i);if(t)keep.push(t);}
      triangles=keep;
    }
    return triangles.filter(t=>t.a<n&&t.b<n&&t.c<n).map(t=>[t.a,t.b,t.c]);
  }
  function assemble(points,triangles,seed) {
    const edgeMap=new Map(),adj=points.map(()=>[]),short=points.map(()=>Infinity),rng=random(seed);
    for(const t of triangles) for(let i=0;i<3;i++) {const a=t[i],b=t[(i+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`; if(!edgeMap.has(key)){edgeMap.set(key,[a,b]);const d=Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1]);adj[a].push([b,d]);adj[b].push([a,d]);short[a]=Math.min(short[a],d);short[b]=Math.min(short[b],d);}}
    return {points,triangles,edges:[...edgeMap.values()],adj,short,phase:points.map(()=>rng()*Math.PI*2),energy:new Float32Array(points.length),xy:new Float32Array(points.length*2)};
  }
  function sampleMesh(w,h,seed,kind='card',cut=16,map=false) {
    const rng=random(seed),points=[],poly=polygon(w,h,cut,map),isBackground=kind==='background',isReveal=kind==='reveal';
    const add=(x,y)=>{if(!points.some(p=>Math.hypot(p[0]-x,p[1]-y)<.8))points.push([x,y]);};
    if(isBackground) {
      const clusters=Array.from({length:Math.ceil(h/420)+2},()=>({x:rng()*w,y:rng()*h,r:60+rng()*160}));
      for(let y=-60;y<=h+60;y+=100+rng()*90){add(-32,y);add(w+32,y+25*rng());}
      add(-32,-60);add(w+32,-60);add(-32,h+60);add(w+32,h+60);
      // Variable exclusion radii create real mixed scales, rather than a jittered grid.
      const count=Math.min(6000,Math.ceil(w*h/1800));
      for(let i=0;i<count;i++) {
        const x=rng()*w,y=rng()*h;
        let near=0;for(const c of clusters)near=Math.max(near,1-smooth(0,c.r,Math.hypot(x-c.x,y-c.y)));
        const radius=(w<700?59:89)*(1-near*.76)*( .8+rng()*.55);
        if(points.every(p=>Math.hypot(x-p[0],y-p[1])>radius))add(x,y);
      }
    } else {
      for(const p of poly)add(...p);
      for(let i=0;i<poly.length;i++) {
        const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        for(let d=0;d<len;d+=(isReveal?40:6)+rng()*(isReveal?35:9))add(a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len);
      }
      if(!isReveal) {
        // Two irregular fine bands follow the actual chamfered perimeter.
        const boundary=[...points],cx=w/2,cy=h/2;
        for(const p of boundary)for(let k=1;k<3;k++)if(rng()>.20){const s=(6+rng()*7)*k,dx=cx-p[0],dy=cy-p[1],l=Math.hypot(dx,dy);add(p[0]+dx/l*s,p[1]+dy/l*s);}
      }
      const spacing=isReveal?38:22,tries=Math.ceil(w*h/(spacing*spacing)*5);
      for(let i=0;i<tries;i++){const x=rng()*w,y=rng()*h;if(!inside(x,y,poly))continue;const d=nearest(x,y,poly).distance;const r=isReveal?30+rng()*29:14+Math.min(25,d*.32)+rng()*11;if(points.every(p=>Math.hypot(x-p[0],y-p[1])>r))add(x,y);}
    }
    return assemble(points,triangulate(points),seed);
  }
  function field(x,y,p,radius) {
    if(!p || p.strength<=0 || !Number.isFinite(p.x+p.y))return 0;
    const dx=x-p.x+Math.sin(y*.017+x*.004)*radius*.075,dy=(y-p.y)*.94+Math.cos(x*.013-y*.006)*radius*.07;
    const warp=1+.14*Math.sin(x*.009+y*.013)+.10*Math.cos(x*.019-y*.005);
    return clamp((1-smooth(radius*.07,radius*warp,Math.hypot(dx,dy)))**1.5*p.strength);
  }
  function visibility(y,top,bottom,bandTop,bandBottom){return smooth(top,top+bandTop,y)*(1-smooth(bottom-bandBottom,bottom,y));}
  function cellVisibility(x,y,seedOffset,load,scrollY,viewH,top=42,band=.16) {
    const screenY=y-scrollY+seedOffset;
    const scroll=visibility(screenY,top,viewH+16,viewH*band,viewH*band);
    return clamp(Math.min(load,scroll));
  }
  function pulseTimes(mesh,x,y,maxDistance=400) {
    const n=mesh.points.length,dist=new Float64Array(n).fill(Infinity),visited=new Uint8Array(n);
    let start=0,closest=Infinity;
    mesh.points.forEach((p,i)=>{const d=Math.hypot(p[0]-x,p[1]-y);if(d<closest){closest=d;start=i;}});dist[start]=0;
    for(let count=0;count<n;count++) {
      let at=-1,min=Infinity;for(let i=0;i<n;i++)if(!visited[i]&&dist[i]<min){min=dist[i];at=i;}
      if(at<0||min>maxDistance)break;visited[at]=1;
      for(const [next,length] of mesh.adj[at]){const candidate=min+length*(.88+(next%7)*.045);if(candidate<dist[next])dist[next]=candidate;}
    }
    return Float32Array.from(dist,d=>d<=maxDistance?d/650:Infinity);
  }
  function pulseEnergy(age,arrival){if(!Number.isFinite(arrival))return 0;const d=age-arrival;return d<0||d>.26?0:Math.sin(Math.PI*d/.26)**2*.75;}
  function displacement(x,y,phase,energy,time,short,kind) {
    const cap=Math.min(short*.055,kind==='background'?3.3:1.15),idle=kind==='background'?.42:.16;
    return [Math.sin(time*.48+phase)*Math.min(idle,cap)+Math.cos(phase)*energy*cap*.65,Math.cos(time*.39+phase)*Math.min(idle,cap)+Math.sin(phase)*energy*cap*.65];
  }
  function scaledTriangle(points,tri,coverage) {
    const p=tri.map(i=>points[i]),cx=p.reduce((s,v)=>s+v[0],0)/3,cy=p.reduce((s,v)=>s+v[1],0)/3,s=Math.sqrt(clamp(coverage));
    return p.map(v=>[cx+(v[0]-cx)*s,cy+(v[1]-cy)*s]);
  }
  function curl(x,y,t,seed){const a=.016,b=.021,phase=seed*.007;return [Math.cos(y*b+t*.7+phase)*Math.sin(x*a+phase)*b*240,-Math.cos(x*a+phase)*Math.sin(y*b+t*.7+phase)*a*240];}
  globalThis.MementoVFXMath=Object.freeze({clamp,smooth,hash,random,polygon,inside,nearest,triangulate,assemble,sampleMesh,field,visibility,cellVisibility,pulseTimes,pulseEnergy,displacement,scaledTriangle,curl});
})();
