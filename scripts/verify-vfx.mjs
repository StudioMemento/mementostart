import assert from 'node:assert/strict';
import '../assets/vfx-math.js';
const M=globalThis.MementoVFXMath;
const mesh=M.sampleMesh(520,260,8129),again=M.sampleMesh(520,260,8129),other=M.sampleMesh(520,260,8130);
assert.deepEqual(mesh.points,again.points);assert.deepEqual(mesh.triangles,again.triangles);assert.notDeepEqual(mesh.points,other.points);
assert.equal(new Set(mesh.edges.map(e=>[...e].sort((a,b)=>a-b).join(':'))).size,mesh.edges.length);
const polygon=M.polygon(520,260,16),area=mesh.triangles.reduce((sum,tri)=>{const [a,b,c]=tri.map(i=>mesh.points[i]);return sum+Math.abs((a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]))/2);},0);
assert.ok(Math.abs(area-(520*260-16*16))<.1,'Triangulation must cover the cut polygon without overlap or holes');
assert.equal(M.inside(1,1,polygon),false);assert.equal(M.inside(519,1,polygon),true);assert.equal(M.inside(1,259,polygon),true);assert.equal(M.inside(519,259,polygon),false);
assert.ok(M.nearest(8,8,polygon).distance<1e-8,'Distance follows diagonal cut, not bounding box');
for(let i=0;i<mesh.points.length;i++){const [x,y]=mesh.points[i],d=M.displacement(x,y,mesh.phase[i],1,150,mesh.short[i],'card');assert.ok(Math.hypot(...d)<=mesh.short[i]*.078,'Bounded membrane displacement');}
for(let x=-500;x<=1500;x+=11)for(let y=-400;y<=900;y+=17){const e=M.field(x,y,{x:100,y:150,strength:1},260);assert.ok(e>=0&&e<=1);}
assert.equal(M.field(5000,5000,{x:100,y:100,strength:1},260),0);assert.equal(M.field(100,100,{x:100,y:100,strength:0},260),0);
const times=M.pulseTimes(mesh,120,120);assert.equal(Math.min(...times),0);assert.ok(times.some(t=>t>.1&&t<Infinity));assert.equal(M.pulseEnergy(10,0),0);assert.equal(M.pulseEnergy(.3,Infinity),0);
const triangle=mesh.triangles[8],collapsed=M.scaledTriangle(mesh.points,triangle,0);assert.deepEqual(collapsed[0],collapsed[1]);assert.deepEqual(M.scaledTriangle(mesh.points,triangle,1),triangle.map(i=>mesh.points[i]));
const positions=[0,80,150,260,400,600,800,1000];const forward=positions.map(scroll=>M.cellVisibility(300,760,4,1,scroll,800));const reverse=positions.toReversed().map(scroll=>M.cellVisibility(300,760,4,1,scroll,800)).toReversed();assert.deepEqual(forward,reverse);assert.ok(forward.some(v=>v>0&&v<1));assert.ok(forward.includes(0));
// Scroll freeze is position-only. Wall-clock or pointer data never enters this driver.
for(let i=0;i<50;i++)assert.equal(M.cellVisibility(300,760,4,1,150,800),forward[2]);
const center=mesh.points.filter(p=>M.nearest(...p,polygon).distance>60),edge=mesh.points.filter(p=>M.nearest(...p,polygon).distance<20);assert.ok(edge.length>center.length,'Fine boundary geometry is separate from the interior');
let positive=0,negative=0;for(let x=0;x<800;x+=30){const c=M.curl(x,50,1,1);if(c[0]>0)positive++;else negative++;}assert.ok(positive&&negative);
// V10 reveals clip a contiguous frontier. Unlike centroid scaling, adjacent cells
// retain shared boundaries and the fully resolved reading area has no gaps.
assert.equal(M.area([]),0);
assert.equal(M.area([[0,0],[20,0],[20,10],[0,10]]),200);
assert.equal(M.area([[0,10],[20,10],[20,0],[0,0]]),200,'Area is independent of winding');
const unitSquare=[[0,0],[20,0],[20,10],[0,10]];
assert.equal(M.area(M.clipPolygon(unitSquare,()=>1)),200,'Positive control: preserve all pixels');
assert.equal(M.area(M.clipPolygon(unitSquare,()=>-1)),0,'Negative control: no visible pixels');
assert.equal(M.area(M.clipPolygon(unitSquare,(x)=>x-10)),100,'A vertical half-plane bisects the square');
assert.equal(M.area(M.clipPolygon(unitSquare,(x,y)=>x+2*y-20)),100,'A diagonal half-plane bisects the square');
for(const [w,h] of [[155,190],[324,174],[800,480],[1012,680]]){
  const reveal=M.sampleMesh(w,h,13017,'reveal',16);
  const boundaries=[-20,0,8,16,h*.25,h*.5,h-16,h-8,h,h+20];
  const clipAt=boundary=>reveal.triangles.map(tri=>M.clipPolygon(tri.map(i=>reveal.points[i]),(x,y)=>y-boundary));
  const outward=boundaries.map(clipAt);
  const inward=[...boundaries].reverse().map(clipAt).reverse();
  assert.deepEqual(outward,inward,`${w}x${h}: reversing the frontier must produce identical cell polygons`);
  for(const boundary of [16,h*.25,h*.5,h-16]){
    const clipped=clipAt(boundary);
    const covered=clipped.reduce((sum,p)=>sum+M.area(p),0);
    // Independent analytic reference: rectangle below the line, minus the lower
    // chamfer triangle. This detects the former shrink-every-cell crack failure.
    const expected=w*(h-boundary)-16*16/2;
    assert.ok(Math.abs(covered-expected)<1e-6,`${w}x${h}: coverage must be contiguous, expected ${expected}, got ${covered}`);
    reveal.triangles.forEach((tri,index)=>{
      const original=tri.map(i=>reveal.points[i]);
      const originalArea=M.area(original),clippedArea=M.area(clipped[index]);
      assert.ok(clippedArea>=0&&clippedArea<=originalArea+1e-7,'Clipping must never create extra cell area');
      if(original.every(p=>p[1]>boundary))assert.deepEqual(clipped[index],original,'Resolved reading-zone triangles retain their original geometry');
      if(original.every(p=>p[1]<boundary))assert.equal(clipped[index].length,0,'Hidden cells remain empty');
    });
  }
}
console.log(`VFX_INVARIANTS_CONFIRMED: ${mesh.points.length} vertices, ${mesh.edges.length} unique edges; deterministic topology, polygon area, field bounds, displacement, graph pulse, signed curl and reversible coverage. V10 contiguous clipping verified against analytic area at four card dimensions, with full/empty controls and exact reverse polygons.`);
// V11: exercise the actual position-only frontier called by the runtime.
const viewport=900, seed=391, samples=[0,90,180,260,420,700,850];
const masksAt=scroll=>samples.map(y=>M.revealDistance(310,y-scroll,viewport,scroll,seed,.20));
assert.deepEqual([0,100,200,400].map(masksAt),[400,200,100,0].map(masksAt).reverse());
assert.ok(M.revealDistance(310,450,viewport,400,seed,.20)>200,'central reading zone preserved');
assert.ok(M.revealDistance(310,50,viewport,400,seed,.20)<0,'upper exit precedes navbar edge');
assert.ok(M.revealDistance(310,850,viewport,400,seed,.20)<0,'lower entry precedes navbar edge');
const frontierMesh=M.sampleMesh(520,260,seed,'reveal',16);
const areaAt=scroll=>frontierMesh.triangles.reduce((sum,tri)=>sum+M.area(M.clipPolygon(tri.map(i=>frontierMesh.points[i]),(x,y)=>M.revealDistance(x+300,y+650-scroll,viewport,scroll,seed,.20))),0);
const values=[0,40,80,120,160,220].map(areaAt);
assert.ok(values.some(a=>a>0&&a<520*260-256));
assert.equal(areaAt(80),areaAt(80),'stationary scroll preserves exact coverage');
assert.deepEqual(values,[220,160,120,80,40,0].map(areaAt).reverse());
console.log('V11_RUNTIME_FRONTIER_CONFIRMED: actual runtime driver has broad fronts, preserved reading area, frozen and reversed exact geometry.');
