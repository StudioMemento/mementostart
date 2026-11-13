/**
 * Background (BKG) GLSL. The plates are linear HDR; the composite writes the engine's frame space (display-encoded,
 * the same space the surfaces and the grade work in), so the sheet sits in the frame exactly like the old one did.
 */

export const BKG_FS_VERT = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }`;

const DEC = /* glsl */ `
uniform float uEncC;
float dec(float y){ y=min(y,.9985); float y2=y*y; return uEncC*y2/(1.-y2); }
float pick(vec3 v,int i){ return i==0?v.r:(i==1?v.g:v.b); }
`;

/** Linear -> the engine's frame space: sRGB below 1, continued with its slope above (so the shoulder rolls highlights). */
const DISPLAY = /* glsl */ `
vec3 display(vec3 c){
  c=max(c,0.);
  vec3 lo=mix(c*12.92,1.055*pow(min(c,vec3(1.)),vec3(1./2.4))-.055,step(.0031308,c));
  return lo+max(c-1.,0.)*.44;
}
`;

/* ------------------------------------------------------------------ depth of field (plate space) */

/** Plate (full res) -> blur res: premultiplied linear key, glow, alpha and the circle of confusion in blur texels. */
export const BKG_PREP_FRAG = /* glsl */ `
precision highp float;
${DEC}
uniform sampler2D tKGA;
uniform sampler2D tDepth;
uniform int uLayer;
uniform vec2 uSrcTexel;
uniform float uDown;
uniform float uFocusW;
uniform float uCocK;
uniform float uMaxCoc;
in vec2 vUv; out vec4 o;
vec4 tap(vec2 uv){ vec3 s=texture(tKGA,uv).rgb; return vec4(dec(s.r),dec(s.g),s.b,0.); }
void main(){
  vec4 a;
  if(uDown>2.5){
    vec2 t=uSrcTexel;
    a=.25*(tap(vUv+vec2(-t.x,-t.y))+tap(vUv+vec2(t.x,-t.y))+tap(vUv+vec2(-t.x,t.y))+tap(vUv+vec2(t.x,t.y)));
  } else a=tap(vUv);
  float w=pick(texture(tDepth,vUv).rgb,uLayer);
  o=vec4(a.rgb,a.b>.002?min(abs(w-uFocusW)*uCocK,uMaxCoc):0.);
}`;

/** Largest CoC of each plane over 8×8 blur texels. */
export const BKG_TILE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D t0; uniform sampler2D t1; uniform sampler2D t2;
uniform ivec2 uSrcSize;
out vec4 o;
void main(){
  ivec2 b=ivec2(gl_FragCoord.xy)*8;
  vec3 m=vec3(0.);
  for(int y=0;y<8;y++) for(int x=0;x<8;x++){
    ivec2 p=min(b+ivec2(x,y),uSrcSize-1);
    m=max(m,vec3(texelFetch(t0,p,0).a,texelFetch(t1,p,0).a,texelFetch(t2,p,0).a));
  }
  o=vec4(m,1.);
}`;

export const BKG_NEIGH_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tTile;
out vec4 o;
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy), sz=textureSize(tTile,0);
  vec3 m=vec3(0.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) m=max(m,texelFetch(tTile,clamp(p+ivec2(x,y),ivec2(0),sz-1),0).rgb);
  o=vec4(m,1.);
}`;

/**
 * Hexagonal bokeh, scatter-as-gather on hex rings. A sample reaches this pixel if its CoC covers the ring of the tap;
 * weights are normalised by the sample's own soft tap count, so a uniform region is preserved exactly and an isolated
 * highlight spreads into a flat hexagon. Opaque pixels gather with their own CoC (nothing far bleeds onto something near
 * inside a plane); empty and edge pixels gather with the neighbourhood's largest, so a defocused plane spreads past its
 * silhouette over the planes behind it. Taps read a prefiltered mip, never a lattice of dots.
 */
export const BKG_GATHER_FRAG = /* glsl */ `
precision highp float;
#define MAX_TAPS 127
uniform sampler2D tPrep;
uniform sampler2D tNeigh;
uniform int uLayer;
uniform int uTaps;
uniform float uRings;
uniform vec3 uOff[MAX_TAPS];
uniform vec2 uTexel;
in vec2 vUv; out vec4 o;
float pick(vec3 v,int i){ return i==0?v.r:(i==1?v.g:v.b); }
float nsoft(float x){
  float n=1.;
  for(int m=1;m<=6;m++){ if(float(m)>uRings) break; n+=6.*float(m)*clamp(x-float(m)+.5,0.,1.); }
  return n;
}
void main(){
  vec4 c0=texelFetch(tPrep,ivec2(gl_FragCoord.xy),0);
  float neigh=pick(texture(tNeigh,vUv).rgb,uLayer);
  float R=mix(neigh,c0.a,smoothstep(.35,.95,c0.b));
  if(R<.6){ o=vec4(c0.rgb,neigh); return; }
  float s=R/uRings, lod=max(log2(s)+.7,0.);
  vec3 acc=c0.rgb/nsoft(c0.a/s);
  for(int i=1;i<MAX_TAPS;i++){
    if(i>=uTaps) break;
    vec3 t=uOff[i];
    vec4 sm=textureLod(tPrep,vUv+t.xy*s*uTexel,lod);
    acc+=sm.rgb*(clamp((sm.a-t.z*s)/s+.5,0.,1.)/nsoft(sm.a/s));
  }
  o=vec4(acc,neigh);
}`;

/* ------------------------------------------------------------------ the frame */

/**
 * Three planes, BG -> MG -> FG, premultiplied; sharp / blurred mixed per pixel by the CoC.
 * Glow: the rest level (breathing) plus the energy of the background chain reaction, read from the energy map: the
 * reaction lights the cracks cell by cell, the faces warm only slightly. Never a disc around the pointer.
 */
export const BKG_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${DEC}
${DISPLAY}
uniform sampler2D tKGA0; uniform sampler2D tKGA1; uniform sampler2D tKGA2;
uniform sampler2D tBlur0; uniform sampler2D tBlur1; uniform sampler2D tBlur2;
uniform sampler2D tDepth;
uniform sampler2D tEnergy;
uniform vec2 uHalf;          // visible half extents, tan
uniform vec2 uPlateExt;      // plate half extents, tan
uniform vec3 uDolly;         // per plane zoom (scroll)
uniform vec3 uShiftY;        // per plane vertical shift (scroll), tan
uniform vec2 uCursor;        // tan
uniform float uCursorR;
uniform vec3 uLift;          // per plane magnification near the pointer: the shards lift a little
uniform float uFocusW;
uniform float uCocKBlur;
uniform vec3 uKeyLayer;
uniform vec3 uGlowLayer;
uniform float uKeyGain;
uniform float uGlowGain;     // rest level, breathing included
uniform float uEnergyGain;   // light the reaction adds in the cracks
uniform vec3 uKeyTint;
uniform float uReveal;       // loading 0..1: the cracks first, then the faces
uniform float uEmissive;     // 1: only what the reaction emits (bloom pass)
uniform float uTransparent;  // 1: hosted surface, black becomes transparent
in vec2 vUv; out vec4 o;

vec3 hue(float x){
  vec3 c0=vec3(.55,.035,.02), c1=vec3(.8,.09,.03), c2=vec3(1.,.3,.06), c3=vec3(1.,.48,.12), c4=vec3(1.,.7,.35);
  if(x<.05) return mix(c0,c1,x/.05);
  if(x<.25) return mix(c1,c2,(x-.05)/.2);
  if(x<.9) return mix(c2,c3,(x-.25)/.65);
  return mix(c3,c4,clamp((x-.9)/2.1,0.,1.));
}
vec2 layerUV(vec2 T,int L){
  float dz=L==0?uDolly.x:(L==1?uDolly.y:uDolly.z);
  float sh=L==0?uShiftY.x:(L==1?uShiftY.y:uShiftY.z);
  float lf=L==0?uLift.x:(L==1?uLift.y:uLift.z);
  vec2 P=T/dz+vec2(0.,sh), d=P-uCursor;
  P=uCursor+d*(1.-lf*exp(-dot(d,d)/(uCursorR*uCursorR)));
  return P/(2.*uPlateExt)+.5;
}
vec3 plane(sampler2D tK,sampler2D tB,vec2 uv,int L){
  vec3 s=texture(tK,uv).rgb, sharp=vec3(dec(s.r),dec(s.g),s.b);
  vec4 b=texture(tB,uv);
  float coc=abs(pick(texture(tDepth,uv).rgb,L)-uFocusW)*uCocKBlur;
  vec3 c=mix(sharp,b.rgb,smoothstep(.55,1.6,sharp.b>.5?coc:b.a));
  vec2 in2=step(vec2(0.),uv)*step(uv,vec2(1.));
  return c*in2.x*in2.y;
}
void main(){
  vec2 T=(vUv-.5)*2.*uHalf;
  vec3 p0=plane(tKGA0,tBlur0,layerUV(T,0),0);
  vec3 p1=plane(tKGA1,tBlur1,layerUV(T,1),1);
  vec3 p2=plane(tKGA2,tBlur2,layerUV(T,2),2);
  p0.xy*=vec2(uKeyLayer.x,uGlowLayer.x); p1.xy*=vec2(uKeyLayer.y,uGlowLayer.y); p2.xy*=vec2(uKeyLayer.z,uGlowLayer.z);
  vec2 acc=p0.xy; acc=p1.xy+(1.-p1.z)*acc; acc=p2.xy+(1.-p2.z)*acc;
  float E=texture(tEnergy,vUv).r;
  float rg=smoothstep(0.,.45,uReveal), rk=smoothstep(.3,1.,uReveal);
  // the reaction lights every crack it crosses, the cold ones too: its light follows the crack network (sqrt of the glow)
  float gE=sqrt(max(acc.y,0.))*uEnergyGain*E*rg;
  if(uEmissive>.5){ o=vec4(display(gE*hue(gE)),0.); return; }
  float g=acc.y*uGlowGain*rg+gE;
  float k=acc.x*uKeyGain*rk;
  vec3 col=k*uKeyTint+g*hue(g)+k*E*.12*hue(.3);
  col=display(col);
  if(uTransparent>.5){ float a=clamp(max(max(col.r,col.g),col.b)*7.,0.,1.); o=vec4(col*a,a); }
  else o=vec4(col,1.);
}`;

/* ------------------------------------------------------------------ energy map */

/** The background chain reaction (screen-space cells, client px) rasterised into a small energy map. */
export const BKG_ENERGY_VERT = /* glsl */ `
precision highp float;
in vec2 position;
in vec2 energy;              // face, smoothed vertex
uniform vec2 uView;          // client px
out float vE;
void main(){
  vE=mix(energy.y,energy.x,.55);
  gl_Position=vec4(position.x/uView.x*2.-1.,1.-position.y/uView.y*2.,0.,1.);
}`;

export const BKG_ENERGY_FRAG = /* glsl */ `
precision highp float;
in float vE; out vec4 o;
void main(){ o=vec4(vE,0.,0.,1.); }`;

/* ------------------------------------------------------------------ motes and glints */

/** Amber motes in the air: hexagonal bokeh when out of focus, energy conserved, hidden behind nearer matter. */
export const BKG_MOTE_VERT = /* glsl */ `
precision highp float;
in vec3 position;
in vec4 iPos;                // x, y (tan), disparity, size (px)
in vec4 iVar;                // brightness, phase, twinkle speed, kind
uniform vec2 uHalf; uniform vec2 uViewPx;
uniform float uFocusW; uniform float uCocKPx; uniform float uMaxCocPx;
uniform float uTime; uniform float uDollyAmt;
uniform sampler2D tDepth; uniform sampler2D tKGA1; uniform sampler2D tKGA2;
uniform vec2 uPlateExt;
uniform float uReveal;
out vec2 vQ; out float vI; out float vCoc; out float vKind;
void main(){
  float w=iPos.z, coc=clamp(abs(w-uFocusW)*uCocKPx,0.,uMaxCocPx), size=max(coc,iPos.w);
  vec2 T=iPos.xy*(1.+uDollyAmt*w*2.);
  vec2 puv=T/(2.*uPlateExt)+.5;
  vec3 dep=texture(tDepth,puv).rgb;
  float a1=texture(tKGA1,puv).b, a2=texture(tKGA2,puv).b;
  float wf=a2>.5?dep.b:(a1>.5?dep.g:dep.r);
  float vis=smoothstep(-.004,.004,w-wf);
  float tw=.75+.25*sin(uTime*iVar.z+iVar.y*6.2831);
  vI=iVar.x*tw*vis*(iPos.w*iPos.w)/(size*size)*smoothstep(.5,1.,uReveal);
  vCoc=coc; vKind=iVar.w; vQ=position.xy;
  gl_Position=vec4(T/uHalf+position.xy*(size*.5+1.5)/(uViewPx*.5),0.,1.);
}`;

export const BKG_MOTE_FRAG = /* glsl */ `
precision highp float;
${DISPLAY}
in vec2 vQ; in float vI; in float vCoc; in float vKind;
uniform float uRot;
out vec4 o;
void main(){
  float c=cos(uRot), s=sin(uRot);
  vec2 q=mat2(c,s,-s,c)*vQ, a=abs(q);
  float hd=max(a.x*.866+a.y*.5,a.y);
  float soft=vCoc>3.?.06:.35;
  float disk=1.-smoothstep(.86-soft,.88,hd);
  float rim=1.+.45*smoothstep(.6,.86,hd)*step(3.,vCoc);
  float m=mix(exp(-dot(vQ,vQ)*6.),disk*rim,smoothstep(1.5,4.,vCoc));
  vec3 col=vKind>.5?vec3(1.,.62,.3):vec3(1.,.4,.09);
  o=vec4(display(col*m*vI),0.);
}`;

/** Glints on facets in focus: tiny four-point stars; the reaction passing makes them flash. */
export const BKG_GLINT_VERT = /* glsl */ `
precision highp float;
in vec3 position;
in vec4 iPos;                // x, y (tan), disparity, plane
in vec4 iVar;                // strength, phase, period, size
uniform vec2 uHalf; uniform vec2 uViewPx;
uniform float uFocusW; uniform float uCocKPx; uniform float uTime;
uniform vec3 uDolly; uniform vec3 uShiftY;
uniform sampler2D tEnergy;
uniform float uEnergyBoost;
uniform float uReveal;
out vec2 vQ; out float vI;
void main(){
  int L=int(iPos.w+.5);
  float dz=L==0?uDolly.x:(L==1?uDolly.y:uDolly.z), sh=L==0?uShiftY.x:(L==1?uShiftY.y:uShiftY.z);
  vec2 T=(iPos.xy-vec2(0.,sh))*dz;
  float inFocus=1.-smoothstep(1.,3.5,abs(iPos.z-uFocusW)*uCocKPx);
  float ph=fract(uTime/iVar.z+iVar.y);
  float flash=smoothstep(0.,.05,ph)*(1.-smoothstep(.05,.22,ph));
  float E=texture(tEnergy,T/uHalf*.5+.5).r;
  vI=iVar.x*inFocus*(flash+uEnergyBoost*E*(.5+.5*sin(uTime*3.+iVar.y*40.)))*smoothstep(.7,1.,uReveal);
  vQ=position.xy;
  gl_Position=vec4(T/uHalf+position.xy*iVar.w/(uViewPx*.5),0.,1.);
}`;

export const BKG_GLINT_FRAG = /* glsl */ `
precision highp float;
${DISPLAY}
in vec2 vQ; in float vI;
out vec4 o;
void main(){
  vec2 a=abs(vQ);
  float m=exp(-dot(vQ,vQ)*40.)*1.6+max(exp(-a.y*60.)*(1.-a.x)+exp(-a.x*60.)*(1.-a.y)*.6,0.)*.5;
  o=vec4(display(vec3(1.,.93,.82)*m*vI),0.);
}`;
