/**
 * GLSL (ES 3.0) for the single WebGL context.
 * Three channels, three programs: the background (a 3D graphite surface), content (monochrome, structure only),
 * overlays (energy: amber light carried by the chain reaction). Particles and a selective bloom complete it.
 */
const COMMON = /* glsl */ `
precision highp float;
precision highp int;
uniform float uTime;
uniform float uMotion;        // 0 with prefers-reduced-motion
uniform vec3 uAmb[4];         // amber scale: deep, mid, hot, core
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
`;

/** Pixel-wide antialiased line on a barycentric coordinate. */
const AA = /* glsl */ `
float aa(float b){ float w=fwidth(b); return 1.-smoothstep(w*.4,w*1.4,b); }
`;

/* Micro-lattice inside glyphs: stable ids from position, mixed sizes through 1:4 subdivision. */
const LATTICE = /* glsl */ `
struct Tri { vec3 b; vec2 c; float id; float edge; };
const mat2 ROT=mat2(.9455,.3256,-.3256,.9455);
vec2 toL(vec2 p,float S){ p=ROT*p; float qy=p.y/.866; return vec2(p.x-.5*qy,qy)/S; }
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

const CLIP = /* glsl */ `
uniform vec2 uView;           // viewport, CSS px
uniform float uScroll;
vec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uScroll))/uView*2.-1.; return vec4(c.x,-c.y,0.,1.); }
`;

/** Structure: mirrors structure.ts (fragmentation, loadingDelay, loadingAbsence). */
const STRUCT = /* glsl */ `
uniform float uBand;          // px
uniform vec2 uBandK;          // top, bottom enable (0 at document start / end)
uniform float uLoad;
float fragAt(float cy){
  float eT=clamp(1.-cy/uBand,0.,1.)*uBandK.x, eB=clamp(1.-(uView.y-cy)/uBand,0.,1.)*uBandK.y;
  return pow(max(eT,eB),1.25);
}
float delayAt(vec2 cd, float seed){ return clamp(mix(seed,vnoise(cd/250.+3.7),.64)*1.16-.08,0.,1.); }
float loadAbs(float delay){ return 1.-smoothstep(delay-.09,delay+.09,uLoad*1.3-.15); }
`;

const PANEL = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uCut;            // top-left, bottom-right
float sdTab(vec2 p){
  vec2 h=uSize*.5, q=p-h, d=abs(q)-h;
  float box=length(max(d,0.))+min(max(d.x,d.y),0.);
  float tl=(uCut.x-p.x-p.y)*.7071, br=(uCut.y-(uSize.x-p.x)-(uSize.y-p.y))*.7071;
  return max(box,max(tl,br));
}
/* Position 0..1 along the outline, clockwise from the top-left corner (mirrors border.ts). */
float outlineAt(vec2 p){
  float w=uSize.x, h=uSize.y;
  vec2 q=clamp(p,vec2(0.),uSize);
  float dT=q.y, dR=w-q.x, dB=h-q.y, dL=q.x, m=min(min(dT,dR),min(dB,dL));
  float s=m==dT?q.x:(m==dR?w+q.y:(m==dB?w+h+(w-q.x):2.*w+h+(h-q.y)));
  return s/(2.*(w+h));
}
`;

/* The photograph exactly as the DOM shows it: object-fit, object-position, opacity, the FAQ fade, the legibility shade. */
const PHOTO = /* glsl */ `
uniform sampler2D uImg;
uniform float uHasImg;
uniform vec4 uImgBox;         // local px: x, y, w, h of the <img> box
uniform vec4 uImgFit;         // uv = q * zw + xy
uniform vec3 uImgStyle;       // opacity, left fade (faq), legibility gradient
/* x: luminance, y: coverage, z: shade of the legibility gradient */
vec3 photo(vec2 p, float inside){
  vec3 r=vec3(0.);
  if(uHasImg<.5) return r;
  vec2 q=(p-uImgBox.xy)/uImgBox.zw;
  vec2 uv=q*uImgFit.zw+uImgFit.xy;
  vec4 t=texture(uImg,clamp(uv,0.,1.));
  // the photographs sit on black: their box fades out over a few percent, so no edge of the image ever shows
  float inBox=smoothstep(0.,.05,q.x)*smoothstep(1.,.95,q.x)*smoothstep(0.,.06,q.y)*smoothstep(1.,.94,q.y)
             *step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  r.x=dot(t.rgb,vec3(.299,.587,.114));
  r.y=t.a*uImgStyle.x*inside*inBox*mix(1.,smoothstep(0.,.36,q.x),uImgStyle.y);
  if(uImgStyle.z>.5){
    float y=clamp((p.y-uSize.y*.34)/(uSize.y*.66),0.,1.);
    r.z=y<.35?mix(0.,.12,y/.35):(y<.75?mix(.12,.56,(y-.35)/.4):mix(.56,.88,(y-.75)/.25));
  }
  return r;
}
`;

/* ------------------------------------------------------------------ background */

export const BG_VERT = /* glsl */ `
${COMMON}
in vec3 position;
in vec3 bary;
in vec4 face;                 // seed, gloss, sheen edge, depth
in vec3 edge;                 // ridge light of the three edges
in vec2 energy;               // face, smoothed vertex
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vPos; out vec3 vBary; flat out vec4 vFace; flat out vec3 vEdge; flat out float vE; out float vEv;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.);   // the sheet is still: only light moves on it
  vPos=mv.xyz; vBary=bary; vFace=face; vEdge=edge; vE=energy.x; vEv=energy.y;
  gl_Position=projectionMatrix*mv;
}`;

export const BG_FRAG = /* glsl */ `
${COMMON}
${AA}
uniform vec3 uBase;
uniform vec2 uZ;              // depth of the first and last ring
uniform float uFog;
uniform float uLoad;
uniform float uAlpha;         // 1 on a transparent (hosted) surface
uniform vec4 uLight[3];       // camera-space position, intensity
uniform vec4 uShade;          // body, diffuse, specular, ridge lines
uniform float uFall;          // light falloff with distance
uniform vec3 uGloss;          // broad sheen: strength, exponent, share on the ridge lines
uniform vec3 uBand;           // drawing-buffer width (px), layout column half-width (0..0.5 of the width), centre level
in vec3 vPos; in vec3 vBary; flat in vec4 vFace; flat in vec3 vEdge; flat in float vE; in float vEv;
out vec4 o;
void main(){
  vec3 n=normalize(cross(dFdx(vPos),dFdy(vPos)));
  vec3 v=normalize(-vPos);
  if(dot(n,v)<0.) n=-n;
  float seed=vFace.x, gloss=vFace.y;
  float h1=h11(seed*3.1), h2=h11(seed*5.7), h3=h11(seed*13.3);
  float depth=clamp(log(max(-vPos.z,1e-3)/uZ.x)/log(uZ.y/uZ.x),0.,1.);
  // grazing light: point lights inside the tunnel rake along the walls; flat faces turn it into sheens and edges
  float spec=0., diff=0., hi=0., broad=0.;
  for(int k=0;k<3;k++){
    vec3 L=uLight[k].xyz-vPos; float d=length(L); L/=d;
    float fall=uLight[k].w/(1.+d*d*uFall);
    diff+=max(dot(n,L),0.)*fall;
    float nh=max(dot(n,normalize(L+v)),0.);
    float s=pow(nh,mix(18.,90.,k==0?h1:h2))*fall;
    spec+=s; hi=max(hi,s); broad+=pow(nh,uGloss.y)*fall;
  }
  float be=vFace.z<.5?vBary.x:(vFace.z<1.5?vBary.y:vBary.z);
  float sweep=exp(-be*mix(2.2,6.5,h3));                    // light raking off the brightest ridge into the face
  // graphite: a dull body, a broad sheen that shapes every facet, a sharp gloss on some of them
  // deep in the centre the sheet is seen edge-on: its facets turn to thin slivers, so gloss and ridge lines fade out
  // there and only the graphite remains; behind the content the field is calm
  float calm=1.-smoothstep(.3,.8,depth);
  float g=uShade.x*(.35+.65*h3*h3)+uShade.y*diff*(.4+.6*h2)+uShade.z*(spec*gloss+broad*uGloss.x*(.5+.5*h1))*(.18+.82*sweep)*mix(.2,1.,calm);
  float l0=aa(vBary.x)*vEdge.x, l1=aa(vBary.y)*vEdge.y, l2=aa(vBary.z)*vEdge.z;
  g+=(l0+l1+l2)*(.04*mix(.3,1.,calm)+uShade.w*(hi*(.35+.65*gloss)+broad*uGloss.z)*calm);   // ridges catch the light, valleys stay dark
  float fog=exp(-pow(depth*uFog,1.6));                      // smaller and darker with depth
  // vertical bands: the gradient runs across the side padding, from the frame (full) to the layout column (dark)
  float fx=abs(gl_FragCoord.x/uBand.x-.5);
  float band=mix(uBand.z,1.,pow(smoothstep(uBand.y*.82,.5,fx),.8));
  fog*=band;
  float d=mix(1.-vFace.w,h2,.45);
  float appear=smoothstep(d-.12,d+.12,uLoad*1.25-.1);
  vec3 col=vec3(g)*vec3(.96,.975,1.)*fog*appear;

  vec3 em=vec3(0.);
  if(vE+vEv>.004){
    // energy: the face inherits amber from its ridge and from its hottest corners; edges carry the brightest line
    float sw=exp(-be*3.);
    float lines=(aa(vBary.x)+aa(vBary.y)+aa(vBary.z));
    float x=clamp(.5*vE+.8*vEv,0.,1.);
    // a large near face never fills with amber: the energy runs along its edges and only warms the face (amber is an event)
    em=ramp(x*(.5+.5*sw))*x*(.45+.75*sw)*2.*mix(.4,1.,smoothstep(.05,.45,depth));
    em+=ramp(.68+.32*vEv)*((l0+l1+l2)*1.5+lines*.45)*vEv*2.;
    em+=ramp(.3)*spec*gloss*vE*.5;
    em*=mix(.55,1.,fog)*appear;
    em*=mix(.18,1.,smoothstep(uBand.y*.7,uBand.y,fx));      // behind the layout column the reaction stays low: content first
  }
  if(uEmissive>.5){ o=vec4(em,1.); return; }
  col+=uBase+em+(h21(gl_FragCoord.xy)-.5)/255.;
  if(uAlpha>.5){ float a=clamp(max(max(col.r,col.g),col.b)*7.,0.,1.); o=vec4(col*a,a); }
  else o=vec4(col,1.);
}`;

/* ------------------------------------------------------------------ content: monochrome, structure only */

export const SURFACE_VERT = /* glsl */ `
${COMMON}
${CLIP}
${STRUCT}
in vec2 position;             // rest position, local px
in vec2 cellCenter;
in float seed;
in vec3 bary;
uniform vec2 uOrigin;         // document px of the surface's top-left
uniform float uPush;
uniform float uSolid;         // 1: never taken apart by scroll (the map)
uniform vec3 uDrift;          // s since the page stopped (0 while it moves), drift speed (px/s), fade time (s)
out vec2 vLocal; out vec3 vBary; out float vGone; out float vTrans;
vec2 curlAt(vec2 p){
  float e=.35, a=vnoise(p+vec2(0.,e)), b=vnoise(p-vec2(0.,e)), c=vnoise(p+vec2(e,0.)), d=vnoise(p-vec2(e,0.));
  vec2 v=vec2(a-b,-(c-d));
  return v/(length(v)+1e-4);
}
void main(){
  vec2 cd=uOrigin+cellCenter;
  float cy=cd.y-uScroll;
  // structure = f(rest position): a stop keeps the phase reached, reversing replays it
  float F=fragAt(cy);
  float th=.14+.7*seed;
  float aS=smoothstep(th-.13,th+.13,F)*(1.-uSolid);
  float aL=loadAbs(delayAt(cd,seed));
  float a=max(aS,aL);
  float eT=clamp(1.-cy/uBand,0.,1.)*uBandK.x, eB=clamp(1.-(uView.y-cy)/uBand,0.,1.)*uBandK.y;
  float dir=eT>eB?-1.:1.;
  // dispersal: the cell shrinks, turns and drifts outward carrying its own piece of content
  vec2 off=vec2((h11(seed*91.)-.5)*1.5,dir*(.45+h11(seed*37.)))*uPush*aS*aS
          +(vec2(h11(seed*53.),h11(seed*71.))-.5)*uPush*.9*aL*aL;
  // a light curl swirl on cells in transition; once the page stops, the cells on their way out become particles:
  // they leave along the curl field and fade, while the cells that stay keep the place scroll gave them
  vec2 flow=curlAt(cd*.006+vec2(uTime*.04,0.))*.85+vec2(0.,dir)*.5;
  float leaving=smoothstep(.05,.3,aS);
  float tau=uDrift.x*leaving;
  off+=flow*(tau*uDrift.y*(.6+.8*h11(seed*13.))+aS*7.*uMotion);
  float gone=max(a,leaving*smoothstep(.1,uDrift.z,uDrift.x));
  float rot=(h11(seed*17.)-.5)*(1.3*a+tau*.9);
  vec2 dv=position-cellCenter;
  dv=mat2(cos(rot),sin(rot),-sin(rot),cos(rot))*dv*(1.-.72*a)*(1.-.65*leaving*smoothstep(0.,uDrift.z,uDrift.x));
  vLocal=position; vBary=bary; vGone=gone; vTrans=4.*a*(1.-a);
  gl_Position=clipOf(cd+dv+off);
}`;

export const SURFACE_FRAG = /* glsl */ `
${COMMON}
${AA}
${PANEL}
${PHOTO}
uniform float uPanel;         // 1 = cut-corner card with fill and border
uniform vec4 uPanelCol;
uniform sampler2D uInk;       // glyphs, icons, dividers: premultiplied colour
uniform float uHasInk;
in vec2 vLocal; in vec3 vBary; in float vGone; in float vTrans;
out vec4 o;
void main(){
  vec2 p=vLocal;
  float sd=uPanel>.5?sdTab(p):-40.;
  float inside=uPanel>.5?1.-smoothstep(-.7,.3,sd):1.;
  vec4 col=uPanel>.5?vec4(uPanelCol.rgb,1.)*uPanelCol.a*inside:vec4(0.);
  vec3 ph=photo(p,inside);
  col.rgb=mix(col.rgb,vec3(ph.x),ph.y);
  col.rgb*=1.-ph.z;
  if(uPanel>.5){
    float frame=1.-smoothstep(0.,1.,abs(sd+.7)-.15);
    float k=(p.x/uSize.x+p.y/uSize.y)*.5;
    float g=mix(mix(.74,.3,smoothstep(.1,.9,k)),.62,smoothstep(.75,1.,k));
    col=mix(col,vec4(vec3(g),1.),frame*.62);
  }
  vec4 ink=uHasInk>.5?texture(uInk,p/uSize):vec4(0.);
  col=ink+col*(1.-ink.a);
  // structure stays monochrome: a cell in transition shows its own seams in grey, nothing lights up
  float seam=aa(min(vBary.x,min(vBary.y,vBary.z)));
  col.rgb=col.rgb*(1.-vTrans*.28)+vec3(.62)*seam*vTrans*col.a*.35;
  float present=1.-smoothstep(.5,.98,vGone);
  if(uEmissive>.5){ o=vec4(0.,0.,0.,col.a*present); return; }
  o=col*present;
}`;

/* ------------------------------------------------------------------ overlays: energy */

export const OVERLAY_VERT = /* glsl */ `
${COMMON}
${CLIP}
${STRUCT}
in vec2 position;             // local px (the network extends into a margin around the surface)
in vec3 bary;
in vec4 cell;                 // seed, zone, sheen edge, -
in vec2 energy;               // face, smoothed vertex
uniform vec2 uOrigin;
uniform float uSolid;
out vec2 vLocal; out vec3 vBary; flat out vec4 vCell; flat out float vE; out float vEv; out float vFade;
void main(){
  vec2 d=uOrigin+position;
  // light belongs to content that is present: it fades where scroll or loading take the structure apart
  vFade=(1.-smoothstep(.02,.3,fragAt(d.y-uScroll)*(1.-uSolid)))*(1.-loadAbs(delayAt(d,.5)));
  vLocal=position; vBary=bary; vCell=cell; vE=energy.x; vEv=energy.y;
  gl_Position=clipOf(d);
}`;

export const OVERLAY_CARD_FRAG = /* glsl */ `
${COMMON}
${AA}
${PANEL}
${PHOTO}
uniform sampler2D uInk;
uniform float uHasInk;
uniform float uHover;         // 0..1, eased
uniform float uGain;          // 1 primary, lower for neighbours in range
uniform float uTopo;          // density of the hover topology: 1 on a card, lower on a large panel (amber is an event)
uniform vec4 uBins[24];       // light along the outline, 96 segments
uniform vec2 uGray;           // luminance of the idle gradient at the base and at the top
uniform vec3 uPointer;        // local px, 1 = the whole card's type turns amber on hover, 0 = only near the pointer (panels)
in vec2 vLocal; in vec3 vBary; flat in vec4 vCell; flat in float vE; in float vEv; in float vFade;
out vec4 o;
float binAt(int i){ i=i<0?i+96:(i>95?i-96:i); return uBins[i/4][i-(i/4)*4]; }
float bins(float s){ float x=s*96.-.5, f=fract(x); int i=int(floor(x)); return mix(binAt(i),binAt(i+1),f); }
void main(){
  vec2 p=vLocal;
  float sd=sdTab(p);
  float inside=1.-smoothstep(-.7,.3,sd);
  float E=vE, Ev=vEv, seed=vCell.x;
  float h=h11(seed*7.1), h2=h11(seed*3.3), h3=h11(seed*11.9);
  vec2 uv=p/uSize;
  float inRange=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  vec4 ink=uHasInk*inRange*texture(uInk,clamp(uv,0.,1.));
  vec3 ph=photo(p,inside);
  float lum=ph.x, ia=ph.y;
  float be=vCell.z<.5?vBary.x:(vCell.z<1.5?vBary.y:vBary.z);
  float sweep=exp(-be*3.4);

  // 1 · the photograph lit from within: a warm grade of its own luminance, never a flat tint over it
  float lift=clamp(uHover*.72+Ev*.8,0.,1.)*uGain;
  float gA=ia*lift*(1.-ph.z*.5)*smoothstep(.015,.12,lum);   // black stays black: no visible image box
  float l=pow(lum,.9);
  vec3 graded=ramp(clamp(l*1.45+.14,0.,1.))*(l*2.5);
  graded*=1.+E*(.24*sweep-.08+.18*(h-.5));                 // each lit cell grades a little differently

  // 2 · the topology: on hover a random set of facets of every size appears, gathered along the outline; each one
  //     breathes on its own slow clock, and the chain reaction accents some zones and leaves others
  float edgeK=vCell.w;
  float pres=step(h3,mix(.14,.8,edgeK*edgeK))*smoothstep(-.15,.55,vCell.y+edgeK*.55);
  float beat=.55+.45*sin(uTime*(.22+.3*h)+h2*6.283)*uMotion;
  float topo=uHover*uGain*pres*beat*uTopo;
  float fA=inside*(E*(.1+.32*h)*(.3+.7*sweep)+topo*(.07+.2*h)*(.35+.65*sweep))*(1.-ia*.4);
  vec3 facet=ramp(.28+.4*E*sweep+.14*topo*sweep)*(.45+.9*sweep);
  float edges=aa(vBary.x)*step(.5,h2)+aa(vBary.y)*step(.5,h3)+aa(vBary.z)*step(.5,h);
  vec3 wire=ramp(.75)*edges*(E*.6+topo*(.11+.24*edgeK))*inside;

  // 3 · the outline lights by segment: a thin bright core and a soft local halo
  float Eb=bins(outlineAt(p));
  float core=1.-smoothstep(0.,1.25,abs(sd+.6));
  float halo=sd>0.?exp(-sd/7.5):exp(sd/16.)*.35;
  vec3 glow=ramp(.5+.36*Eb)*(core*Eb*1.7+halo*Eb*.9)*vFade;   // same saturation as the background's edges

  vec4 c=vec4(graded*gA,gA);
  c=vec4(facet*fA+c.rgb*(1.-fA),fA+c.a*(1.-fA));
  c.rgb+=wire;
  // type and icons: white with a grey base at rest, the same gradient in amber on hover; never covered
  float il=ink.a>.003?dot(ink.rgb/ink.a,vec3(.3333)):1.;
  float ti=clamp((il-uGray.x)/(uGray.y-uGray.x),0.,1.);
  float near=exp(-dot(p-uPointer.xy,p-uPointer.xy)/(170.*170.));
  float ik=clamp(uHover*mix(near,1.,uPointer.z)+Ev*.5,0.,1.)*uGain;
  vec3 iw=mix(ramp(.32),mix(ramp(.86),vec3(1.,.95,.86),.35),pow(ti,.8));
  c=c*(1.-ink.a)+vec4(iw*ink.a*ik,ink.a*ik);
  c*=vFade;
  if(uEmissive>.5){ o=vec4((graded*gA*smoothstep(.3,.85,lum)*.85+facet*fA*.7+wire)*vFade+glow,0.); return; }
  o=vec4(c.rgb+glow,c.a);
}`;

export const OVERLAY_TITLE_FRAG = /* glsl */ `
${COMMON}
${AA}
${LATTICE}
uniform vec2 uSize;
uniform sampler2D uInk;
uniform sampler2D uDist;      // signed distance to the letters (0.5 on the outline, ±uRange px at 0 and 1)
uniform float uRange;         // px
uniform float uEm;            // px, font size
uniform vec2 uGray;           // luminance of the idle gradient at the base and at the top of the block
uniform float uGain;
uniform float uHover;         // 0..1, eased
uniform vec3 uPointer;        // local px, range of the pointer (px)
uniform float uMicro;         // px, micro-lattice inside the glyphs
in vec2 vLocal; in vec3 vBary; flat in vec4 vCell; flat in float vE; in float vEv; in float vFade;
out vec4 o;
/* px from the nearest outline: negative inside a letter; beyond the texture, the distance to it is added */
float sdAt(vec2 p){
  vec2 uv=p/uSize, q=clamp(uv,0.,1.);
  return (texture(uDist,q).r-.5)*2.*uRange+length((uv-q)*uSize);
}
void main(){
  vec2 p=vLocal;
  // two levels, as in the boards: on hover the whole block warms (base, ~80%); the cells the range reaches and the
  // reaction they start go to full amber (100%). The range is a cluster of cells eased in time (drive): never a disc.
  float base=uHover*uGain*(.8+.06*sin(uTime*.8+p.x*.0025)*uMotion);
  float local=clamp(vEv*1.12+vE*.32,0.,1.15);
  float level=max(base*.55,local);
  if(level<.01) discard;
  float sd=sdAt(p);
  if(sd>uRange) discard;
  vec2 uv=p/uSize;
  vec4 ink=texture(uInk,clamp(uv,0.,1.))*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  float a=ink.a;
  float lum=a>.003?dot(ink.rgb/a,vec3(.3333)):1.;
  float t=clamp((lum-uGray.x)/(uGray.y-uGray.x),0.,1.);   // 0 at the shaded base of the block, 1 at its lit top
  // base: the grey gradient becomes a warm one over the whole block, warm white on top, soft amber-gold at the base
  vec3 warmTop=vec3(1.,.955,.89), warmLow=mix(ramp(.62),vec3(.9,.66,.42),.3);
  vec3 warm=mix(warmLow,warmTop,smoothstep(.02,.9,t));
  // in range: full amber climbing from the base, the top stays pale and luminous
  float fill=smoothstep(t-.3,t+.06,local*1.05);
  vec3 hot=mix(ramp(.2+.18*local),ramp(.45+.17*local),pow(t,.8));
  hot=mix(hot,vec3(1.,.93,.82),smoothstep(.6,1.,t)*.6);
  // micro-facets of mixed sizes inside the reached letters, switched on and off slowly
  Tri m=tri(toL(p,uMicro),vec2(.62,.42));
  float mh=h11(m.id*5.1), mh2=h11(m.id*9.7);
  float th=.18+.6*mh*mh+.05*sin(uTime*(.16+.4*mh2)+mh*40.)*uMotion;
  float lit=smoothstep(th,th+.16,local)*step(.2,mh2);
  vec3 facet=ramp(.4+.28*local*(.6+.4*mh))*(.72+.5*h11(m.id*2.7)-.2*m.b.y);
  float wire=(1.-smoothstep(0.,1.,m.edge*uMicro*.8))*step(.45,h11(m.id*11.3));
  vec3 col=mix(vec3(lum),warm,clamp(base,0.,1.)*.92);
  col=mix(col,hot,fill);
  col=mix(col,facet,lit*.6);
  col+=uAmb[3]*wire*lit*.22;
  float k=max(clamp(base,0.,1.),max(fill,lit*.85));
  // edge light that follows each letter: a rim just inside the outline where the energy is, a soft light outside
  float g=clamp(local*1.1+base*.12,0.,1.)*vFade;
  float rim=a*exp(-max(-sd,0.)/(uEm*.02));
  float outer=(1.-a)*exp(-max(sd,0.)/(uEm*.042))*(1.-smoothstep(uRange*.5,uRange,sd));
  vec3 rimC=ramp(.6+.22*g)*rim*local*vFade*.75;
  vec3 glow=ramp(.38+.22*g)*outer*(.04+.2*g);
  if(uEmissive>.5){ o=vec4(col*a*fill*(.03+.2*lit)*vFade+rimC*.28,0.); return; }
  o=vec4(col*a*k*vFade+rimC*k+glow,a*k*vFade+outer*(.05+.18*g));
}`;

/* ------------------------------------------------------------------ particles */

export const PART_VERT = /* glsl */ `
precision highp float;
${CLIP}
in vec2 corner;
in vec3 cbary;
in vec4 aP;                   // x, y (document px), size, rotation
in vec3 aL;                   // life 1..0, heat, opacity
out float vLife; out float vHeat; out float vOp; out vec3 vB;
void main(){
  float s=sin(aP.w), c=cos(aP.w);
  gl_Position=clipOf(aP.xy+mat2(c,s,-s,c)*corner*aP.z);
  vLife=aL.x; vHeat=aL.y; vOp=aL.z; vB=cbary;
}`;

export const PART_FRAG = /* glsl */ `
${COMMON}
${AA}
in float vLife; in float vHeat; in float vOp; in vec3 vB;
out vec4 o;
void main(){
  float a=smoothstep(0.,.3,vLife)*smoothstep(1.,.85,vLife)*vOp;
  // larger shards are translucent with a bright rim; sparks are solid
  float rim=aa(min(min(vB.x,vB.y),vB.z));
  float body=vOp<.99?mix(.55,1.5,rim):1.;
  vec3 c=ramp(.4+.6*vHeat)*a*body*1.3;
  o=vec4(c,uEmissive>.5?0.:a*.3);
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
