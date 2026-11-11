/**
 * GLSL for the Memento VFX layers.
 * One shared triangular lattice drives every effect so loading, hover, text and scroll read as the same material.
 */

const COMMON = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec4 uS[8];   // pointer samples: xy = document px, z = age in seconds, w = strength
uniform int uN;

float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y);
}

/* Sampled amber scale: #FF4500 > #FF6600 > #FF8C00 > #FFB300 > #FFBF00, with a pale hot core. */
vec3 ramp(float x){
  x=clamp(x,0.,1.);
  vec3 c=mix(vec3(1.,.27,0.), vec3(1.,.40,0.), smoothstep(0.,.25,x));
  c=mix(c, vec3(1.,.549,0.), smoothstep(.25,.5,x));
  c=mix(c, vec3(1.,.702,0.), smoothstep(.5,.72,x));
  c=mix(c, vec3(1.,.749,0.), smoothstep(.72,.88,x));
  return mix(c, vec3(1.,.9,.62), smoothstep(.9,1.,x));
}

/* Energy left by the pointer at c. Each cell passes its own decay rate, so groups release at different times. */
float field(vec2 c, float radius, float rate){
  float I=0.;
  for(int k=0;k<8;k++){
    if(k>=uN) break;
    vec2 d=c-uS[k].xy;
    I=max(I, uS[k].w*exp(-dot(d,d)/(radius*radius))*exp(-uS[k].z*rate));
  }
  return I;
}

struct Tri { vec3 b; vec2 c; float id; float edge; float scale; };

/* Triangle containing lattice point q; up to two levels of 1:4 subdivision give cells of mixed size. */
Tri tri(vec2 q, vec3 sub){
  vec2 i=floor(q), f=fract(q);
  bool up=f.x+f.y>1.;
  vec2 v0,v1,v2; vec3 b;
  if(!up){ v0=i; v1=i+vec2(1,0); v2=i+vec2(0,1); b=vec3(1.-f.x-f.y,f.x,f.y); }
  else { v0=i+vec2(1,1); v1=i+vec2(0,1); v2=i+vec2(1,0); b=vec3(f.x+f.y-1.,1.-f.x,1.-f.y); }
  float id=h21(i+(up?vec2(.37,.61):vec2(0.))+vec2(17.3,5.9));
  float scale=1.;
  for(int l=0;l<3;l++){
    if(h11(id*91.7+float(l)*3.1)>=sub[l]) break;
    vec2 A=v0,B=v1,C=v2; float k;
    if(b.x>.5){ v1=(A+B)*.5; v2=(A+C)*.5; b=vec3(2.*b.x-1.,2.*b.y,2.*b.z); k=1.; }
    else if(b.y>.5){ v0=(A+B)*.5; v2=(B+C)*.5; b=vec3(2.*b.x,2.*b.y-1.,2.*b.z); k=2.; }
    else if(b.z>.5){ v0=(A+C)*.5; v1=(B+C)*.5; b=vec3(2.*b.x,2.*b.y,2.*b.z-1.); k=3.; }
    else { v0=(B+C)*.5; v1=(A+C)*.5; v2=(A+B)*.5; b=vec3(1.)-2.*b; k=4.; }
    id=h11(id*57.3+k*13.7); scale*=.5;
  }
  Tri t; t.b=b; t.c=(v0+v1+v2)/3.; t.id=id; t.scale=scale; t.edge=min(b.x,min(b.y,b.z))*scale;
  return t;
}
`;

/* Document-space lattice used by every overlay effect: rotated, slightly stretched, gently warped. */
const DOC_LATTICE = /* glsl */ `
const mat2 ROT=mat2(.9455,.3256,-.3256,.9455);
const float STRETCH=1.3;
vec2 warp(vec2 p,float S){ return (vec2(vnoise(p/(S*4.5)),vnoise(p/(S*4.5)+19.7))-.5)*S*.7; }
vec2 toL(vec2 p,float S){ p+=warp(p,S); p=ROT*p; p.x/=STRETCH; float qy=p.y/.866; return vec2(p.x-.5*qy,qy)/S; }
vec2 fromL(vec2 q,float S){ q*=S; vec2 p=vec2((q.x+.5*q.y)*STRETCH,.866*q.y); p=transpose(ROT)*p; return p-warp(p,S); }
`;

export const QUAD_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aUnit;
uniform vec4 uRect;     // document px: x, y, w, h
uniform vec2 uView;     // viewport css px
uniform float uScroll;
out vec2 vDoc;
out vec2 vUv;
void main(){
  vUv=aUnit;
  vDoc=uRect.xy+aUnit*uRect.zw;
  vec2 c=(vDoc-vec2(0.,uScroll))/uView*2.-1.;
  gl_Position=vec4(c.x,-c.y,0.,1.);
}`;

/* Loading cells + scroll fronts. Covers content cell by cell; amber marks where the composition is changing. */
export const VEIL_FRAG = /* glsl */ `#version 300 es
${COMMON}
${DOC_LATTICE}
in vec2 vDoc;
uniform vec2 uView;
uniform float uScroll;
uniform float uLoad;      // 0 = all cells absent, 1 = present
uniform float uScrollE;   // scroll energy 0..1
uniform float uBand;      // height of the exit / entry bands in px
uniform vec2 uCol;        // content column: left, right
uniform vec3 uBase;
uniform float uCell;
uniform float uCover;     // 0 on a transparent surface: nothing opaque is laid over the host page
out vec4 o;
void main(){
  Tri t=tri(toL(vDoc,uCell),vec3(.62,.4,0.));
  vec2 c=fromL(t.c,uCell);
  float cy=c.y-uScroll;
  float edgePx=t.edge*uCell*.8;
  float line=1.-smoothstep(0.,1.1,edgePx);
  float h=h11(t.id*7.13);

  // --- Scroll: fragmentation depends only on the position inside the band, so a stop keeps the phase reached.
  float e=clamp(max(1.-cy/uBand, 1.-(uView.y-cy)/uBand),0.,1.);
  float inCol=smoothstep(uCol.x-uCell*.4,uCol.x,c.x)*(1.-smoothstep(uCol.y,uCol.y+uCell*.4,c.x));
  float F=pow(e,1.45)*.94*step(.5,inCol);
  float gone=smoothstep(t.id-.035,t.id+.035,F)*step(.0005,F);
  float front=exp(-pow((F-t.id)/.17,2.))*step(.012,F)*uScrollE;

  // --- Loading: distributed random order, clustered so portions join continuously.
  float r=clamp(mix(h, vnoise(c/230.+3.7), .58)*1.25-.12,0.,1.);
  float L=uLoad*1.34-.14;
  float covered=1.-smoothstep(r-.012,r+.012,L);
  float since=max(L-r,0.);
  float settling=(1.-uLoad);
  float heatL=exp(-since/.15)*(1.-covered)*step(.3,h11(t.id*3.3))*settling;   // just joined: amber
  float pre=exp(-max(r-L,0.)/.07)*covered*step(.45,h11(t.id*5.9))*settling;   // about to join: lit facet

  float late=smoothstep(.66,.9,r);                                            // last groups to join stay amber
  float cover=max(gone*.97,covered)*uCover;
  float shade=.93+.14*h11(t.id*2.31);
  vec3 col=uBase*shade*cover;
  float a=cover;
  // what stays after a stop: monochrome seams, and uneven shading while the composition settles
  col+=vec3(.1)*line*F*(1.-gone)*.4;
  a+=line*F*(1.-gone)*.25*uCover;
  a+=(1.-covered)*settling*.34*h*step(.004,uLoad)*uCover;
  col+=vec3(.2)*line*covered*.08;

  // amber marks where the composition is changing: it tints the content of the cell itself
  float grad=.3+.7*t.b.x;
  float fa=front*(.45+.55*h);
  float la=heatL*(.25+.75*h11(t.id*4.7));
  float tint=clamp(fa+la,0.,1.)*(1.-cover);
  float heat=clamp(max(fa,la)*1.05,0.,1.);
  col+=ramp(heat)*tint*.9*grad;
  a+=tint*.78;
  // cells about to join: lit facets instead of plain black
  float pa=clamp(pre*(.3+.7*h)+late*covered*(.25+.5*h)*smoothstep(.5,.85,uLoad),0.,1.);
  col+=ramp(pa*.8)*pa*.55*grad;
  // fine mesh and vertices on the active front
  float vert=smoothstep(.86,.96,max(t.b.x,max(t.b.y,t.b.z)));
  col+=ramp(.8)*line*(front*1.1+heatL*.6+pre*.6+late*covered*.35*smoothstep(.5,.85,uLoad));
  col+=ramp(.95)*vert*(front*.75+heatL*.3);
  // latent mesh trace while settling
  col+=vec3(.5,.42,.3)*line*settling*uLoad*(1.-covered)*.12;
  o=vec4(col,clamp(a,0.,1.));
}`;

/* Energy inside glyphs (or an icon silhouette): cells light up, the grey gradient warms locally, a thin glow hugs the outline. */
export const GLYPH_FRAG = /* glsl */ `#version 300 es
${COMMON}
${DOC_LATTICE}
in vec2 vDoc;
in vec2 vUv;
uniform sampler2D uMask;  // r = glyph coverage, g = soft halo
uniform float uCell;
uniform float uGain;
uniform float uRadius;
out vec4 o;
void main(){
  vec2 mk=texture(uMask,vUv).rg;
  float m=mk.r, g=mk.g;
  if(m+g<.004) discard;
  float Is=field(vDoc,uRadius*1.15,2.4)*uGain;
  if(Is<.004) discard;
  Tri t=tri(toL(vDoc,uCell),vec3(.55,.3,0.));
  vec2 c=fromL(t.c,uCell);
  float h=h11(t.id*5.1), h2=h11(t.id*9.7);
  float I=field(c,uRadius,mix(.7,3.4,h2))*uGain;
  float th=.12+.6*h*h+.07*sin(uTime*(2.+5.*h2)+h*40.);
  float lit=smoothstep(th,th+.1,I);
  float heat=clamp(I*(.5+.75*h2),0.,1.);
  float facet=.72+.5*h11(t.id*2.7)-.25*t.b.y;
  vec3 col=ramp(heat)*facet;
  float edgePx=t.edge*uCell*.8;
  float line=(1.-smoothstep(0.,.9,edgePx))*step(.4,h11(t.id*11.3+floor(uTime*2.5)));
  col+=vec3(1.,.82,.45)*line*.55;
  float aLit=m*lit*.94;
  float aWarm=m*(1.-lit)*Is*.42;
  vec3 rgb=col*aLit+ramp(.55)*aWarm;
  rgb+=vec3(1.,.8,.4)*line*m*(1.-lit)*Is*.35;          // intermittent triangular weave
  rgb+=ramp(.4)*g*(1.-m)*Is*Is*1.25;                       // thin outer edge glow
  o=vec4(rgb,aLit+aWarm*.85);
}`;

/* Tabs: the nearest stretch of border lights first; inside, cells switch on and off over the content. */
export const TAB_FRAG = /* glsl */ `#version 300 es
${COMMON}
${DOC_LATTICE}
in vec2 vDoc;
uniform vec4 uBox;      // document px: x, y, w, h
uniform vec2 uCut;      // cut size at top-left and bottom-right (0 = square corner)
uniform float uGain;
uniform float uHover;   // 0..1
uniform float uCell;
uniform float uRadius;
out vec4 o;
float sdTab(vec2 p){
  vec2 h=uBox.zw*.5, q=p-uBox.xy-h;
  vec2 d=abs(q)-h;
  float box=length(max(d,0.))+min(max(d.x,d.y),0.);
  float tl=(uCut.x-(q.x+h.x)-(q.y+h.y))*.7071;
  float br=(uCut.y-(h.x-q.x)-(h.y-q.y))*.7071;
  return max(box,max(tl,br));
}
void main(){
  float sd=sdTab(vDoc);
  float Ib=field(vDoc,uRadius*1.35,2.)*uGain;      // proximity range (wider than the hover core)
  float island=0.;
  vec3 rgb=vec3(0.); float a=0.;
  if(sd<0.){
    Tri t=tri(toL(vDoc,uCell),vec3(.6,.35,0.));
    vec2 c=fromL(t.c,uCell);
    float h=h11(t.id*5.1), h2=h11(t.id*9.7);
    float I=field(c,uRadius,mix(.7,3.4,h2))*uGain;
    float th=.3+.5*h+.08*sin(uTime*(1.6+5.*h2)+h*31.);
    float lit=smoothstep(th,th+.1,I)*mix(.35,1.,uHover);
    // sparse islands elsewhere in the hovered tab respond more weakly
    island=step(.955,h11(t.id*3.9))*uHover*(.5+.5*sin(uTime*(1.2+3.*h)+h2*20.))*.5;
    float heat=clamp(I*(.45+.7*h2),0.,1.);
    float grad=.3+.7*t.b.z;
    float edgePx=t.edge*uCell*.8;
    float line=1.-smoothstep(0.,.8,edgePx);
    float inner=smoothstep(0.,10.,-sd);
    rgb+=ramp(heat)*lit*grad*.26*inner;
    rgb+=ramp(.35)*island*grad*.3*inner;
    rgb+=ramp(.7)*line*(lit*.5+I*uHover*.22+island*.4)*inner;      // very fine mesh
    a+=(1.-lit)*smoothstep(.12,.5,I)*uHover*.2*step(.5,h)*inner;   // unlit cells shade the content
    rgb+=ramp(.5)*exp(sd/16.)*Ib*.16;                              // light inner glow
  } else {
    rgb+=ramp(.45)*exp(-sd/7.)*Ib*.5;                              // thin outer edge glow
  }
  float edge=1.-smoothstep(0.,1.35,abs(sd+.6));
  rgb+=ramp(.55+.45*Ib)*edge*pow(Ib,.8)*1.15;
  if(rgb.r+a<.002) discard;
  o=vec4(rgb,a);
}`;

/* Short-lived triangles detached from glyphs, borders and scroll fronts. */
export const PART_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aP;   // x, y (document px), size, rotation
layout(location=2) in vec2 aL;   // life 1..0, heat
uniform vec2 uView;
uniform float uScroll;
out float vLife;
out float vHeat;
void main(){
  float s=sin(aP.w), c=cos(aP.w);
  vec2 p=aP.xy+mat2(c,s,-s,c)*aCorner*aP.z;
  vec2 n=(p-vec2(0.,uScroll))/uView*2.-1.;
  gl_Position=vec4(n.x,-n.y,0.,1.);
  vLife=aL.x; vHeat=aL.y;
}`;

export const PART_FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vLife; in float vHeat;
out vec4 o;
void main(){
  float x=clamp(vHeat,0.,1.);
  vec3 c=mix(vec3(1.,.3,0.), vec3(1.,.72,.05), x);
  float a=smoothstep(0.,.25,vLife)*smoothstep(1.,.8,vLife);
  o=vec4(c*a*.95,a*.15);
}`;

export const BG_VERT = /* glsl */ `#version 300 es
layout(location=0) in vec2 aUnit;
void main(){ gl_Position=vec4(aUnit*2.-1.,0.,1.); }`;

/*
 * Background: one continuous faceted surface along both lateral margins.
 * Wide open cells at the viewport edge, finer and darker toward the layout padding, near silence behind the content.
 */
export const BG_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform vec2 uRes;
uniform float uDpr;
uniform float uScroll;
uniform vec2 uCol;
uniform vec3 uBase;
uniform float uAlpha;   // 1 = transparent surface (hosted in the hub)
out vec4 o;

float sideOf;
vec2 origin;

/* viewport px <> lattice of one layer: long plates, each layer leaning at its own angle */
vec2 toB(vec2 p, float S, vec2 cs, float stretch){
  p-=origin; p.x*=sideOf;
  p=vec2(cs.x*p.x+cs.y*p.y, -cs.y*p.x+cs.x*p.y);
  p.x/=stretch;
  float qy=p.y/.866;
  return vec2(p.x-.5*qy,qy)/S;
}
vec2 fromB(vec2 q, float S, vec2 cs, float stretch){
  q*=S;
  vec2 p=vec2((q.x+.5*q.y)*stretch,.866*q.y);
  p=vec2(cs.x*p.x-cs.y*p.y, cs.y*p.x+cs.x*p.y);
  p.x*=sideOf;
  return p+origin;
}

/* Glossy plate: mostly near-black graphite; a few faces carry a reflection that fades across the face. */
float plate(Tri t, vec2 cw, float seed, out float gloss){
  float h1=h11(t.id*3.7+seed), h2=h11(t.id*8.3+seed), h3=h11(t.id*12.9+seed);
  // slow wave: the reflection drifts from face to face, the relief itself stays shallow
  float wave=sin(cw.x*.0061+cw.y*.0043+uTime*.34+h3*2.)*.5+.5;
  gloss=pow(clamp(h1*.8+wave*.3,0.,1.),5.);
  float along=h2<.34?t.b.x:(h2<.67?t.b.y:t.b.z);
  float sweep=pow(clamp(1.-along*1.1,0.,1.),2.2);
  return .014+.034*h3*h3+gloss*(.04+.5*sweep);
}

void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;
  vec2 V=uRes/uDpr;
  sideOf=p.x<(uCol.x+uCol.y)*.5?-1.:1.;
  float edgeX=sideOf<0.?uCol.x:uCol.y;
  float marginW=max(sideOf<0.?uCol.x:V.x-uCol.y,24.);
  float dx=sideOf<0.?uCol.x-p.x:p.x-uCol.y;
  float din=clamp(.22*marginW+26.,30.,110.);
  float pres=pow(smoothstep(-din,marginW*.55,dx),1.7);
  float dither=(h21(gl_FragCoord.xy)-.5)/255.;
  if(pres<.002){ o=uAlpha>.5?vec4(0.):vec4(uBase+dither,1.); return; }

  float S=clamp(marginW*.5,70.,190.);
  origin=vec2(edgeX,-uScroll*.12+sideOf*137.);
  vec2 pw=p+(vec2(vnoise(p/310.),vnoise(p/310.+31.7))-.5)*S*.22;

  // three overlapping layers: wide plates toward the viewport edge, a finer and darker mesh toward the layout
  const vec2 CS1=vec2(.8480,.5299), CS2=vec2(.9272,-.3746), CS3=vec2(.6018,.7986);
  float S1=S, S2=S*.52, S3=S*.27;
  Tri t1=tri(toB(pw,S1,CS1,2.5),vec3(0.));
  Tri t2=tri(toB(pw,S2,CS2,2.1)+vec2(.37,.11),vec3(0.));
  Tri t3=tri(toB(pw,S3,CS3,1.8)+vec2(.13,.71),vec3(0.));
  vec2 c1=fromB(t1.c,S1,CS1,2.5), c2=fromB(t2.c-vec2(.37,.11),S2,CS2,2.1);
  float m1=(sideOf<0.?uCol.x-c1.x:c1.x-uCol.y)/marginW;
  float m2=(sideOf<0.?uCol.x-c2.x:c2.x-uCol.y)/marginW;
  float on1=step(h11(t1.id*4.1),smoothstep(.12,.92,m1)*.8);
  float on2=step(h11(t2.id*6.3),smoothstep(-.05,.6,m2)*.75)*(1.-on1);
  float on3=(1.-on1)*(1.-on2);

  float g1,g2,g3;
  float f1=plate(t1,c1,0.,g1), f2=plate(t2,c2,5.,g2)*.72, f3=plate(t3,c2,9.,g3)*.5;
  float e1=t1.edge*S1*.82, e2=t2.edge*S2*.82, e3=t3.edge*S3*.82;
  // contact shadow under the edge of every plate above
  float sh1=mix(.28,1.,smoothstep(0.,S1*.16,e1));
  float sh2=mix(.4,1.,smoothstep(0.,S2*.16,e2));
  float l1=1.-smoothstep(0.,1.2,e1), l2=1.-smoothstep(0.,1.1,e2), l3=1.-smoothstep(0.,1.,e3);
  float gray=on1*(f1+l1*(.03+.8*g1))
            +on2*(f2+l2*(.022+.6*g2))*sh1
            +on3*(f3+l3*(.016+.4*g3))*sh1*sh2;
  float m=clamp(dx/marginW,0.,1.);
  gray*=mix(.5,1.15,m);

  // the cell that answers the pointer is whichever layer is on top here
  Tri tA=t1; vec2 cA=c1; float lineA=l1;
  if(on2>.5){ tA=t2; cA=c2; lineA=l2; }
  else if(on3>.5){ tA=t3; cA=p; lineA=l3*.7; }
  float open=on3;

  // proximity: edges gather amber reflections, faces inherit part of that light
  vec2 pd=p+vec2(0.,uScroll);
  float Is=field(pd,240.,1.7);
  vec3 amber=vec3(0.);
  if(Is>.003){
    float h=h11(tA.id*5.1), h2=h11(tA.id*9.7);
    float I=field(cA+vec2(0.,uScroll),215.,mix(.6,3.,h2));
    float e=I*(.3+.9*h*h);
    float lit=smoothstep(.24,.62,e)*(1.-open*.75);
    float along=h2<.5?tA.b.x:tA.b.y;
    float grad=pow(clamp(1.-along*1.15,0.,1.),1.8);
    amber+=ramp(clamp(e*.9,0.,.86)*(.2+.8*grad))*lit*(.06+.94*grad);
    amber+=ramp(.25+.75*Is*Is)*lineA*Is*Is*1.3*(1.-open*.8);
    amber+=ramp(.2)*Is*Is*.05;
  }
  vec3 col=uBase+(vec3(gray)*vec3(.97,.985,1.)+amber)*pres;
  col+=dither;
  if(uAlpha>.5){ float al=smoothstep(0.,.3,pres); o=vec4(col*al,al); }
  else o=vec4(col,1.);
}`;
