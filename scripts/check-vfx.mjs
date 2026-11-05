import assert from 'node:assert/strict';
import '../assets/vfx/math.js';
const {clamp,smooth,hash,field,phase,mesh}=globalThis.MementoFXMath;
const c={top:[.02,.16],bottom:[.8,1],rootGate:.12};
assert.equal(field(0,1000,0,0,c),1);assert.equal(field(1000,1000,0,0,c),1);
assert.equal(field(0,1000,0,4000,c),1);assert.equal(field(1000,1000,4000,4000,c),1);
for(const y of [160,200,500,800])assert.equal(field(y,1000,800,4000,c),1);
assert.equal(field(0,1000,800,4000,c),0);assert.equal(field(1000,1000,800,4000,c),0);
for(let i=0;i<=1000;i++)assert.ok(field(i,1000,400,4000,c)>=0&&field(i,1000,400,4000,c)<=1);
const first=mesh(1024,640,26,42),second=mesh(1024,640,26,42);assert.deepEqual(first,second);
assert.notDeepEqual(first,mesh(1024,640,26,41));
for(const t of first){assert.equal(phase(0,t.h).fill,0);assert.equal(phase(1,t.h).fill,1);assert.equal(phase(0,t.h).wire,0);assert.equal(phase(1,t.h).wire,0);assert.equal(phase(0,t.h).trail,0);assert.equal(phase(1,t.h).trail,0);}
const downward=Array.from({length:100},(_,i)=>phase(field(950-i*9,1000,800,4000,c),hash(i)));
const upward=Array.from({length:100},(_,i)=>phase(field(950-(99-i)*9,1000,800,4000,c),hash(99-i))).reverse();assert.deepEqual(downward,upward);
const area=first.reduce((sum,t)=>{const [a,b,c]=t.points;return sum+Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;},0);
assert.ok(Math.abs(area-1024*640)<1e-6);assert.equal(clamp(-10),0);assert.equal(smooth(0,1,.5),.5);
console.log('Passed: viewport boundaries, central readability, short documents, reversible field, phase endpoints, deterministic topology and gap-free mesh area.');

// V2 regression: the bright wire front occupies < 56 CSS px in a 900 px viewport.
for(const band of [.115,.14]){let strong=0;for(let y=0;y<=900;y++){const p=smooth(0,band*900,y);if(phase(p,.5).wire>.5)strong++;}assert.ok(strong<56);}for(let h=0;h<=1;h+=.05)assert.equal(phase(.65,h).fill,1);

const border=mesh(1024,640,19,42,16);assert.ok(border.length<mesh(1024,640,19,42).length/4);
assert.deepEqual(border,mesh(1024,640,19,42,16));
console.log("VFX math verified");
