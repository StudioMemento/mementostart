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
console.log(`VFX_INVARIANTS_CONFIRMED: ${mesh.points.length} vertices, ${mesh.edges.length} unique edges; deterministic topology, polygon area, field bounds, displacement, graph pulse, signed curl and reversible coverage.`);
