/**
 * GLSL (ES 3.0) for the single WebGL context: background shards, content surfaces, particles, selective bloom.
 * Structure (which cells exist) is decided in the vertex stage from rest positions; energy (amber light) in the fragment stage.
 */
const COMMON = /* glsl */ `
precision highp float;
precision highp int;
uniform float uTime;
uniform float uMotion;        // 0 with prefers-reduced-motion
uniform vec4 uS[8];           // energy samples: xy document px, z age (s), w strength
uniform int uN;
uniform vec3 uAmb[4];         // amber scale: deep, mid, hot, core
uniform vec3 uAmbBase;        // translucent low-energy tint
uniform float uEmissive;      // 1 while rendering the emission-only pass that feeds the bloom

float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y);
}
vec3 ramp(float x){
  x=clamp(x,0.,1.);
  vec3 c=mix(uAmb[0],uAmb[1],smoothstep(0.,.36,x));
  c=mix(c,uAmb[2],smoothstep(.36,.72,x));
  return mix(c,uAmb[3],smoothstep(.76,1.,x));
}
/* Energy at c: nucleus, mid zone and an irregular tail. Distance gives the trend, noise breaks the rim. */
float field(vec2 c, float radius, float rate){
  float I=0.;
  float rim=1.+.34*(vnoise(c/64.)-.5);
  for(int k=0;k<8;k++){
    if(k>=uN) break;
    vec2 d=(c-uS[k].xy)*rim;
    I=max(I, uS[k].w*exp(-dot(d,d)/(radius*radius))*exp(-uS[k].z*rate));
  }
  return I;
}
`;

const CLIP = /* glsl */ `
uniform vec2 uView;           // viewport, CSS px
uniform float uScroll;
vec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uScroll))/uView*2.-1.; return vec4(c.x,-c.y,0.,1.); }
`;

/* Micro-lattice for energy: stable ids from position only, mixed cell sizes through 1:4 subdivision. */
const LATTICE = /* glsl */ `
struct Tri { vec3 b; vec2 c; float id; float edge; };
const mat2 ROT=mat2(.9455,.3256,-.3256,.9455);
vec2 toL(vec2 p,float S){ p=ROT*p; float qy=p.y/.866; return vec2(p.x-.5*qy,qy)/S; }
vec2 fromL(vec2 q,float S){ q*=S; return transpose(ROT)*vec2(q.x+.5*q.y,.866*q.y); }
Tri tri(vec2 q, vec2 sub){
  vec2 i=floor(q), f=fract(q);
  bool up=f.x+f.y>1.;
  vec2 v0,v1,v2; vec3 b;
  if(!up){ v0=i; v1=i+vec2(1,0); v2=i+vec2(0,1); b=vec3(1.-f.x-f.y,f.x,f.y); }
  else { v0=i+vec2(1,1); v1=i+vec2(0,1); v2=i+vec2(1,0); b=vec3(f.x+f.y-1.,1.-f.x,1.-f.y); }
  float id=h21(i+(up?vec2(.37,.61):vec2(0.))+vec2(17.3,5.9));
  float scale=1.;
  for(int l=0;l<2;l++){
    if(h11(id*91.7+float(l)*3.1)>=sub[l]) break;
    vec2 A=v0,B=v1,C=v2; float k;
    if(b.x>.5){ v1=(A+B)*.5; v2=(A+C)*.5; b=vec3(2.*b.x-1.,2.*b.y,2.*b.z); k=1.; }
    else if(b.y>.5){ v0=(A+B)*.5; v2=(B+C)*.5; b=vec3(2.*b.x,2.*b.y-1.,2.*b.z); k=2.; }
    else if(b.z>.5){ v0=(A+C)*.5; v1=(B+C)*.5; b=vec3(2.*b.x,2.*b.y,2.*b.z-1.); k=3.; }
    else { v0=(B+C)*.5; v1=(A+C)*.5; v2=(A+B)*.5; b=vec3(1.)-2.*b; k=4.; }
    id=h11(id*57.3+k*13.7); scale*=.5;
  }
  Tri t; t.b=b; t.c=(v0+v1+v2)/3.; t.id=id; t.edge=min(b.x,min(b.y,b.z))*scale;
  return t;
}
`;

/* ------------------------------------------------------------------ background */

export const BG_VERT = /* glsl */ `
${COMMON}
${CLIP}
in vec2 position;             // viewport px
in vec4 data;                 // seed, tone, gloss edge, layer
in float grad;
in vec3 bary;
out vec2 vPos; out float vGrad; out vec3 vBary; flat out vec4 vData;
void main(){
  float s=data.x;
  // slow wave: the same surface breathing; vertices move a few px, never a fold
  vec2 p=position+uMotion*vec2(sin(uTime*.21+position.y*.006+s*6.3),cos(uTime*.17+position.x*.005+s*4.1))*2.2*step(.5,data.w);
  vPos=p; vGrad=grad; vBary=bary; vData=data;
  vec2 c=p/uView*2.-1.;
  gl_Position=vec4(c.x,-c.y,0.,1.);
}`;

export const BG_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uView;
uniform vec2 uCol;            // content column: left, right
uniform vec3 uBase;
uniform float uLoad;
uniform float uAlpha;         // 1 on a transparent (hosted) surface
uniform float uScroll;
uniform float uBgGain;
uniform float uBgRadius;
uniform vec2 uRate;
in vec2 vPos; in float vGrad; in vec3 vBary; flat in vec4 vData;
out vec4 o;
float aa(float b){ float w=fwidth(b); return 1.-smoothstep(w*.35,w*1.35,b); }
void main(){
  float s=vData.x, tone=vData.y, layer=vData.w;
  float h2=h11(s*7.3), h3=h11(s*13.1), h4=h11(s*21.7);
  // presence: quiet reading centre, lateral extremes strongest, no rigid side strips
  vec2 c=vec2((uCol.x+uCol.y)*.5,uView.y*.5);
  vec2 ax=vec2(max((uCol.y-uCol.x)*.5,uView.x*.3),uView.y*.56);
  vec2 d=abs(vPos-c)/ax;
  float r=pow(pow(d.x,2.6)+pow(d.y*.8,2.6),1./2.6);
  float P=mix(.07,1.,smoothstep(.5,1.22,r));
  float breathe=.5+.5*sin(uTime*.29+s*6.28)*uMotion;

  float be=vData.z<.5?vBary.x:(vData.z<1.5?vBary.y:vBary.z);     // distance from this face's gloss edge
  float gloss=pow(h3,2.4)*(.72+.28*breathe);
  float body=.006+.03*tone*tone+(.016+.24*pow(h2,2.6)*(.7+.3*breathe))*pow(vGrad,1.6);
  float sheen=exp(-be*mix(4.,14.,h2))*gloss*.95*smoothstep(-.1,.55,vGrad);
  float l0=aa(vBary.x), l1=aa(vBary.y), l2=aa(vBary.z);
  float lg=vData.z<.5?l0:(vData.z<1.5?l1:l2);
  float bell=exp(-pow((vGrad-.25-.5*h4)/.3,2.));
  float lines=(l0+l1+l2)*.035+lg*(.07+1.9*gloss*bell);
  float gray=(body+sheen)*(layer>.5?1.:.55)+lines;
  float appear=smoothstep(h4-.12,h4+.12,uLoad*1.3-.15);
  vec3 col=vec3(gray)*vec3(.97,.985,1.)*P*appear;

  // proximity: vertices and edges gather the amber, faces inherit part of it; the rest stays calm
  vec3 em=vec3(0.);
  if(uN>0){
    // groups of faces release with different delays: the rate belongs to the face
    float vE=field(vPos+vec2(0.,uScroll),uBgRadius,mix(uRate.x,uRate.y,h11(s*9.7))*.8)*uBgGain;
    float core=field(vPos+vec2(0.,uScroll),uBgRadius*.42,uRate.y)*uBgGain;
    float sel=.16+.84*step(.3,h11(s*5.1));
    float x=clamp(vE*vE*(.6+.6*h2)*1.25,0.,1.);
    float towards=pow(clamp(1.-be*1.05,0.,1.),1.5);
    em=ramp(x*(.28+.5*towards)+core*.16)*x*sel*(.22+.78*towards)*1.25;
    em+=ramp(.55+.45*vE)*(lg*1.5+(l0+l1+l2)*.75)*vE*vE*1.6;
    em*=max(P,.22)*appear;
  }

  if(uEmissive>.5){ o=vec4(em,1.); return; }
  col+=uBase+em+(h21(gl_FragCoord.xy)-.5)/255.;
  if(uAlpha>.5){ float a=clamp(smoothstep(.07,.6,P)+max(em.r,em.g),0.,1.); o=vec4(col*a,a); }
  else o=vec4(col,1.);
}`;

/* ------------------------------------------------------------------ content surfaces */

export const SURFACE_VERT = /* glsl */ `
${COMMON}
${CLIP}
in vec2 position;             // rest position, local px
in vec2 cellCenter;
in float seed;
in vec3 bary;
uniform vec2 uOrigin;         // document px of the surface's top-left
uniform float uBand;          // px
uniform vec2 uBandK;          // top, bottom enable (0 at document start / end)
uniform float uLoad;
uniform float uScrollE;
uniform float uPush;
out vec2 vLocal; out vec2 vDoc; out vec3 vBary; flat out float vSeed; out float vGone; out float vHeat;
void main(){
  vec2 cd=uOrigin+cellCenter;
  float cy=cd.y-uScroll;
  // structure = f(rest position). Mirrors structure.ts: fragmentation(), cellAbsence(), loadingAbsence().
  float eT=clamp(1.-cy/uBand,0.,1.)*uBandK.x, eB=clamp(1.-(uView.y-cy)/uBand,0.,1.)*uBandK.y;
  float F=pow(max(eT,eB),1.25);
  float th=.14+.7*seed;
  float aS=smoothstep(th-.13,th+.13,F);
  float delay=clamp(mix(seed,vnoise(cd/250.+3.7),.64)*1.16-.08,0.,1.);
  float aL=1.-smoothstep(delay-.09,delay+.09,uLoad*1.3-.15);
  float a=max(aS,aL);
  float dir=eT>eB?-1.:1.;
  // dispersal: the cell shrinks, turns and drifts outward carrying its own piece of content
  vec2 off=vec2((h11(seed*91.)-.5)*1.5,dir*(.45+h11(seed*37.)))*uPush*aS*aS
          +(vec2(h11(seed*53.),h11(seed*71.))-.5)*uPush*.9*aL*aL;
  float rot=(h11(seed*17.)-.5)*1.3*a;
  vec2 dv=position-cellCenter;
  dv=mat2(cos(rot),sin(rot),-sin(rot),cos(rot))*dv*(1.-.72*a);
  vLocal=position; vDoc=uOrigin+position; vBary=bary; vSeed=seed; vGone=a;
  vHeat=clamp(4.*aS*(1.-aS)*uScrollE+4.*aL*(1.-aL)*step(.001,uLoad)*(1.-uLoad),0.,1.);
  gl_Position=clipOf(cd+dv+off);
}`;

export const SURFACE_FRAG = /* glsl */ `
${COMMON}
${LATTICE}
uniform vec2 uSize;
uniform float uPanel;         // 1 = cut-corner card with fill and border
uniform vec2 uCut;            // top-left, bottom-right
uniform vec4 uPanelCol;
uniform sampler2D uInk;       // glyphs, icons, dividers: premultiplied colour
uniform float uHasInk;
uniform sampler2D uImg;
uniform float uHasImg;
uniform vec4 uImgBox;         // local px: x, y, w, h of the <img> box
uniform vec4 uImgFit;         // uv = q * zw + xy  (object-fit / object-position)
uniform vec3 uImgStyle;       // opacity, left fade (faq), legibility gradient
uniform float uTitle;         // 1 = large type: full cell language inside the glyphs
uniform float uGain;          // 1 primary surface, lower for neighbours in range
uniform float uHover;
uniform float uPulse;         // entry impulse
uniform float uRadius;
uniform float uMicro;         // px, micro-lattice cell
uniform vec2 uRate;           // slowest, fastest release (1/s)
in vec2 vLocal; in vec2 vDoc; in vec3 vBary; flat in float vSeed; in float vGone; in float vHeat;
out vec4 o;
float aa(float b){ float w=fwidth(b); return 1.-smoothstep(w*.35,w*1.35,b); }
float sdTab(vec2 p){
  vec2 h=uSize*.5, q=p-h, d=abs(q)-h;
  float box=length(max(d,0.))+min(max(d.x,d.y),0.);
  float tl=(uCut.x-p.x-p.y)*.7071, br=(uCut.y-(uSize.x-p.x)-(uSize.y-p.y))*.7071;
  return max(box,max(tl,br));
}
void main(){
  vec2 p=vLocal;
  float sd=uPanel>.5?sdTab(p):-40.;
  float inside=uPanel>.5?1.-smoothstep(-.7,.3,sd):1.;
  vec4 col=vec4(0.);
  vec3 em=vec3(0.);
  float lum=0.;
  if(uPanel>.5) col=vec4(uPanelCol.rgb,1.)*uPanelCol.a*inside;

  // photograph: framing, scale and UVs never move; only light changes
  if(uHasImg>.5){
    vec2 q=(p-uImgBox.xy)/uImgBox.zw;
    vec2 uv=q*uImgFit.zw+uImgFit.xy;
    if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.&&uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.){
      vec4 t=texture(uImg,uv);
      lum=dot(t.rgb,vec3(.299,.587,.114));
      float a=t.a*uImgStyle.x*inside*mix(1.,smoothstep(0.,.36,q.x),uImgStyle.y);
      col.rgb=mix(col.rgb,vec3(lum),a);
      lum*=a;
    }
    if(uImgStyle.z>.5){
      float y=clamp((p.y-uSize.y*.34)/(uSize.y*.66),0.,1.);        // bottom 66%: label stays readable
      float k=y<.35?mix(0.,.12,y/.35):(y<.75?mix(.12,.56,(y-.35)/.4):mix(.56,.88,(y-.75)/.25));
      col.rgb*=1.-k; lum*=1.-k*.6;
    }
  }
  // neutral frame: thin, discreet
  if(uPanel>.5){
    float frame=1.-smoothstep(.0,1.,abs(sd+.7)-.15);
    float g=mix(.74,.3,smoothstep(.1,.9,(p.x/uSize.x+p.y/uSize.y)*.5));
    g=mix(g,.62,smoothstep(.75,1.,(p.x/uSize.x+p.y/uSize.y)*.5));
    col=mix(col,vec4(vec3(g),1.),frame*.62);
  }
  vec4 ink=uHasInk>.5?texture(uInk,p/uSize):vec4(0.);
  col=ink+col*(1.-ink.a);

  // ---------------- energy: local, on what is present
  float Is=field(vDoc,uRadius*1.25,uRate.x)*uGain;
  if(Is>.004){
    Tri t=tri(toL(vDoc,uMicro),vec2(.5,.22));
    vec2 c=fromL(t.c,uMicro);
    float h=h11(t.id*5.1), h2=h11(t.id*9.7);
    float I=field(c,uRadius,mix(uRate.x,uRate.y,h2))*uGain*(1.+.7*uPulse);
    // "shift": with pointer and geometry still, the distribution of light drifts slowly
    float th=(uTitle>.5?.2+.46*h*h:.2+.58*h)+.07*sin(uTime*(.35+.9*h2)+h*40.)*uMotion;
    float lit=smoothstep(th,th+.1,I);
    float heat=clamp(I*(.42+.62*h2),0.,1.);
    float wire=1.-smoothstep(0.,1.,t.edge*uMicro*.8);
    if(uTitle>.5){
      float facet=.74+.46*h11(t.id*2.7)-.22*t.b.y;
      vec3 lava=ramp(heat)*facet+uAmb[3]*wire*.42;
      float k=lit*.97;
      col.rgb=col.rgb*(1.-k)+lava*ink.a*k;
      float warm=(1.-lit)*Is*.5;                                   // the grey warms locally, the rest keeps its base
      col.rgb=mix(col.rgb,uAmbBase*ink.a*(.55+.45*dot(ink.rgb,vec3(.333))),warm);
      col.rgb+=uAmb[2]*wire*ink.a*(1.-lit)*Is*.3;
      em+=lava*ink.a*k*.5+uAmbBase*ink.a*warm*.2;
    } else {
      float inner=inside*smoothstep(0.,10.,-sd);
      float rim=mix(.32,1.,smoothstep(.12,.5,length(p/uSize-.5)));  // edges and vertices recede toward the centre
      // translucent amber that follows the luminance of the image; some faces go darker instead
      float facet=.55+.75*h11(t.id*2.7)*(.35+.65*t.b.x);
      vec3 tint=ramp(heat*(.55+.45*facet))*(.07*facet+2.1*lum);
      float k=lit*mix(.3,.92,uHover)*inner;
      col.rgb=col.rgb*(1.-k*.45)+tint*k;
      col.rgb*=1.-.34*(1.-lit)*smoothstep(.12,.5,I)*step(.5,h)*uHover*inner;
      float island=step(.962,h11(t.id*3.9))*uHover*(.5+.5*sin(uTime*(.8+2.*h)+h2*20.))*.45;
      float part=step(.5,h11(t.id*7.9+floor(t.b.x*3.)));               // incomplete edges
      vec3 w=ramp(.7)*wire*part*(lit*.22+island*.4)*rim*inner+ramp(.3)*island*.16*inner;
      col.rgb+=w;
      em+=tint*k*.75+w;
      // labels take a contained accent, no lattice
      float acc=ink.a*Is*.78;
      col.rgb=mix(col.rgb,uAmb[2]*ink.a+col.rgb*(1.-ink.a),acc);
      em+=uAmb[2]*acc*.28;
      if(uPanel>.5){
        // border answers per segment and by distance: thin bright core, soft local halo
        float Ib=field(vDoc,uRadius*1.4,uRate.x)*uGain;
        float core=1.-smoothstep(0.,1.25,abs(sd+.7));
        vec3 eb=ramp(.45+.55*Ib)*core*pow(Ib,1.35)*1.6;
        col.rgb+=eb+ramp(.4)*exp(sd/13.)*Ib*.2*inside;
        col.a=max(col.a,core*min(Ib*2.,1.));
        em+=eb*1.2;
      }
    }
  }
  // ---------------- structure: amber only marks cells that are changing
  if(vHeat>.004){
    float seam=aa(min(vBary.x,min(vBary.y,vBary.z)));
    vec3 fh=ramp(.3+.6*vHeat)*(.2+1.3*max(lum,dot(col.rgb,vec3(.333))))*vHeat;
    col.rgb=col.rgb*(1.-vHeat*.45)+fh*col.a+ramp(.9)*seam*vHeat*col.a;
    em+=(fh+ramp(.9)*seam*vHeat)*col.a;
  }
  float present=1.-smoothstep(.5,.98,vGone);
  if(uEmissive>.5){ o=vec4(em*present,col.a*present); return; }
  o=col*present;
}`;

/* ------------------------------------------------------------------ particles */

export const PART_VERT = /* glsl */ `
precision highp float;
${CLIP}
in vec2 corner;
in vec4 aP;                   // x, y (document px), size, rotation
in vec2 aL;                   // life 1..0, heat
out float vLife; out float vHeat;
void main(){
  float s=sin(aP.w), c=cos(aP.w);
  gl_Position=clipOf(aP.xy+mat2(c,s,-s,c)*corner*aP.z);
  vLife=aL.x; vHeat=aL.y;
}`;

export const PART_FRAG = /* glsl */ `
${COMMON}
in float vLife; in float vHeat;
out vec4 o;
void main(){
  float a=smoothstep(0.,.3,vLife)*smoothstep(1.,.82,vLife);
  vec3 c=ramp(.35+.6*vHeat)*a;
  o=vec4(c,uEmissive>.5?a:a*.35);
}`;

/* ------------------------------------------------------------------ selective bloom */

export const FS_VERT = /* glsl */ `
precision highp float;
in vec2 position;
out vec2 vUv;
void main(){ vUv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`;

export const BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv; out vec4 o;
void main(){
  vec3 c=texture(uTex,vUv).rgb*.2270;
  c+=(texture(uTex,vUv+uStep*1.385).rgb+texture(uTex,vUv-uStep*1.385).rgb)*.3162;
  c+=(texture(uTex,vUv+uStep*3.231).rgb+texture(uTex,vUv-uStep*3.231).rgb)*.0703;
  o=vec4(c,1.);
}`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uStrength;
in vec2 vUv; out vec4 o;
void main(){ o=vec4(texture(uTex,vUv).rgb*uStrength,0.); }`;
