import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Master Visual DNA 1.1, §7.1: monotone cubic ramps, sampled in float.
// CSS retains fractional sRGB/alpha values: no intermediate 8-bit raster.
function pchip(xs, ys) {
  const n=xs.length, h=xs.slice(1).map((x,i)=>x-xs[i]);
  const d=h.map((v,i)=>(ys[i+1]-ys[i])/v), m=Array(n).fill(0);
  const endpoint=(h0,h1,d0,d1)=>{
    let v=((2*h0+h1)*d0-h0*d1)/(h0+h1);
    if(Math.sign(v)!==Math.sign(d0))v=0;
    else if(Math.sign(d0)!==Math.sign(d1)&&Math.abs(v)>Math.abs(3*d0))v=3*d0;
    return v;
  };
  m[0]=endpoint(h[0],h[1],d[0],d[1]);
  m[n-1]=endpoint(h[n-2],h[n-3],d[n-2],d[n-3]);
  for(let i=1;i<n-1;i++)if(d[i-1]*d[i]>0){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);}
  return x=>{
    let i=0;while(i<n-2&&x>xs[i+1])i++;
    const t=(x-xs[i])/h[i], t2=t*t,t3=t2*t;
    return Math.max(0,Math.min(1,(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h[i]*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h[i]*m[i+1]));
  };
}
const rgba=hex=>{const v=hex.replace('#','');return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255).concat(v.length===8?parseInt(v.slice(6,8),16)/255:1);};
const specs=[
  ['title-gradient','135deg',[0,.34,.61,.81,1],['#f5f3ef','#f5f3ef','#eee4d6','#ddbb8b','#c98b42'].map(rgba)],
  ['category-gradient','0deg',[0,.24,.53,.83,1],['#c98b42','#dfba86','#eee5d7','#f5f3ef','#f5f3ef'].map(rgba)],
  ['frame-gradient','135deg',[0,.27,.62,.83,1],['#d8d1c3c7','#aaa28f66','#716a5e57','#8c744b75','#d9913de0'].map(rgba)],
  ['photo-alpha','90deg',[0,.1,.2,.3,.4,1],[0,24,118,221,255,255].map(a=>[0,0,0,a/255])],
  ['tile-alpha','180deg',[0,.1,.5,.8,.9,1],[255,255,237,84,43,0].map(a=>[0,0,0,a/255])],
  ['tile-frame-alpha','180deg',[0,.1,.5,.8,.9,1],[255,255,255,110,59,0].map(a=>[0,0,0,a/255])]
];
let css='/* Generated from Master Visual DNA 1.1 by scripts/build-gradients.mjs. */\n:root{\n';
const report=[];
for(const [name,angle,xs,ys] of specs){
  const curves=[0,1,2,3].map(c=>pchip(xs,ys.map(y=>y[c])));
  const positions=[...new Set([...Array.from({length:401},(_,i)=>i/400),...xs])].sort((a,b)=>a-b);
  const samples=positions.map(x=>curves.map(f=>f(x)));
  let maxError=0;
  for(let i=0;i<positions.length-1;i++)for(let j=1;j<10;j++){
    const t=j/10,x=positions[i]+t*(positions[i+1]-positions[i]);
    for(let c=0;c<4;c++)maxError=Math.max(maxError,Math.abs(curves[c](x)-(samples[i][c]*(1-t)+samples[i+1][c]*t)));
  }
  if(maxError>1/255)throw Error(name+' exceeds DNA tolerance');
  const stops=samples.map((v,i)=>`rgba(${v.slice(0,3).map(n=>(n*255).toFixed(3)).join(',')},${v[3].toFixed(6)}) ${(positions[i]*100).toFixed(3)}%`);
  css+=`--${name}:linear-gradient(${angle},${stops.join(',')});\n`;
  report.push({name,maxChannelError:maxError,limit:1/255,anchorsExact:xs.every((x,i)=>curves.every((f,c)=>Math.abs(f(x)-ys[i][c])<1e-10))});
}
css+='}\n';
const root=fileURLToPath(new URL('../',import.meta.url));
writeFileSync(root+'assets/gradients.css',css);
writeFileSync(root+'docs/gradient-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
