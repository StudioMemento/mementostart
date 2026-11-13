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
/* x: luminance, y: coverage, z: shade of the legibility gradient; phRGB keeps the colour */
vec3 phRGB=vec3(0.);
vec3 photo(vec2 p, float inside){
  vec3 r=vec3(0.);
  if(uHasImg<.5) return r;
  vec2 q=(p-uImgBox.xy)/uImgBox.zw;
  vec2 uv=q*uImgFit.zw+uImgFit.xy;
  vec4 t=texture(uImg,clamp(uv,0.,1.));
  // the photographs sit on black: their box fades out over a few percent, so no edge of the image ever shows
  float inBox=smoothstep(0.,.05,q.x)*smoothstep(1.,.95,q.x)*smoothstep(0.,.06,q.y)*smoothstep(1.,.94,q.y)
             *step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  r.x=dot(t.rgb,vec3(.299,.587,.114)); phRGB=t.rgb;
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
in float rock;                // height within its block: 0 in the crack, 1 on the crest
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec3 vPos; out vec3 vBary; flat out vec4 vFace; flat out vec3 vEdge; flat out float vE; out float vEv; out float vRock;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.);   // the sheet is still: only light moves on it
  vPos=mv.xyz; vBary=bary; vFace=face; vEdge=edge; vE=energy.x; vEv=energy.y; vRock=rock;
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
uniform vec4 uGloss;          // broad sheen: strength, exponent, share on the ridge lines; faint level of every edge
uniform vec4 uBand;           // drawing-buffer width (px), layout column half-width (0..0.5 of the width), level at the column edge, far cells behind it
uniform vec3 uRim;            // foreground ridge highlights: strength, depth reach, selectivity
uniform vec4 uEnv;            // obsidian: overhead softbox and strips, far light at the end of the tunnel, Fresnel F0, surface flecks
uniform vec4 uKey;            // a soft light from above (direction, camera space; strength): it shapes every block, crest lit, underside dark
in vec3 vPos; in vec3 vBary; flat in vec4 vFace; flat in vec3 vEdge; flat in float vE; in float vEv; in float vRock;
out vec4 o;
/*
 * The still studio the black glass reflects, symmetric about the tunnel's axis: a long softbox overhead, two thin strip
 * lights across the tunnel (crisp lines that sweep across the facets), the light at the far end of the tunnel.
 */
float studio(vec3 r){
  float top=smoothstep(.04,.6,r.y)*(.55+.45*smoothstep(.6,.9,r.y));
  float strips=exp(-pow((r.y-.3)/.04,2.))+.55*exp(-pow((r.y+.2)/.03,2.));
  float far=pow(max(-r.z,0.),5.);
  return (top*.45+strips*smoothstep(-.3,.5,-r.z))*uEnv.x+far*uEnv.y;
}
void main(){
  vec3 n=normalize(cross(dFdx(vPos),dFdy(vPos)));
  vec3 v=normalize(-vPos);
  if(dot(n,v)<0.) n=-n;
  float seed=vFace.x, gloss=vFace.y;
  float h1=h11(seed*3.1), h2=h11(seed*5.7), h3=h11(seed*13.3);
  float depth=clamp(log(max(-vPos.z,1e-3)/uZ.x)/log(uZ.y/uZ.x),0.,1.);
  float calm=1.-smoothstep(.3,.8,depth);
  // the cracks between blocks hold the dark: light reaches them last (occlusion), the crests first
  float occ=mix(.28,1.,smoothstep(0.,.42,vRock));
  // point lights inside the tunnel, on its axis: they rake along the walls, symmetric
  float spec=0., diff=0., hi=0., broad=0.;
  for(int k=0;k<3;k++){
    vec3 L=uLight[k].xyz-vPos; float d=length(L); L/=d;
    float fall=uLight[k].w/(1.+d*d*uFall);
    diff+=max(dot(n,L),0.)*fall;
    float nh=max(dot(n,normalize(L+v)),0.);
    float s=pow(nh,mix(40.,220.,k==0?h1:h2))*fall;           // obsidian: sharp, small highlights
    spec+=s; hi=max(hi,s); broad+=pow(nh,uGloss.y)*fall;
  }
  float be=vFace.z<.5?vBary.x:(vFace.z<1.5?vBary.y:vBary.z);
  float sweep=exp(-be*mix(2.2,6.5,h3));                    // light raking off the brightest ridge into the face
  // surface: black glass with a graphite grain. Flecks and fine conchoidal marks break the reflections up a little
  vec3 wp=vPos*(64./(1.+depth*3.));
  float fleck=vnoise(wp.xy+wp.z*1.7+seed*40.)*.45+vnoise(wp.yz*3.1+seed*13.)*.35+vnoise(wp.xz*7.3-seed*7.)*.2;
  fleck=mix(1.,.6+.8*fleck,uEnv.w*calm);
  // obsidian: what the faces reflect, stronger at grazing angles (Fresnel); every face is glossy, some are mirrors
  float ndv=max(dot(n,v),0.);
  float F=uEnv.z+(1.-uEnv.z)*pow(1.-ndv,4.);
  vec3 r=reflect(-v,n);
  float mirror=(.35+.65*gloss)*fleck;
  float refl=studio(r)*F*mirror;
  // graphite: a dull body and a broad sheen that shapes every facet; obsidian: sharp highlights on the glossy ones
  float key=max(dot(n,normalize(uKey.xyz)),0.);
  float g=uShade.x*(.35+.65*h3*h3)+uShade.y*diff*(.4+.6*h2)+uKey.w*key*key*(.6+.4*h1)
         +(uShade.z*spec*gloss*gloss*fleck+uGloss.x*broad*(.5+.5*h1))*(.12+.88*sweep)*mix(.2,1.,calm)
         +refl*mix(.35,1.,calm);
  g*=occ;
  float l0=aa(vBary.x)*vEdge.x, l1=aa(vBary.y)*vEdge.y, l2=aa(vBary.z)*vEdge.z;
  // the edges of the blocks are glass: a thin line that lights where it catches a highlight or the studio
  g+=(l0+l1+l2)*(uGloss.w*mix(.3,1.,calm)+uShade.w*(hi*(.35+.65*gloss)+broad*uGloss.z+refl*1.6)*calm)*occ;
  // foreground: only the sharpest ridges of the nearest faces light up, a thin cold line on a dark body
  float near=1.-smoothstep(0.,uRim.y,depth);
  float r0=aa(vBary.x)*pow(vEdge.x,uRim.z), r1=aa(vBary.y)*pow(vEdge.y,uRim.z), r2=aa(vBary.z)*pow(vEdge.z,uRim.z);
  g+=(r0+r1+r2)*uRim.x*near*(.45+.55*sweep)*occ;
  g=1.-exp(-g);                                             // highlights roll off instead of clipping to flat white
  float fog=exp(-pow(depth*uFog,1.6));                      // smaller and darker with depth
  // vertical bands: bright at the frame, darkest at the edge of the layout column
  float fx=abs(gl_FragCoord.x/uBand.x-.5), cb=uBand.y;
  fog*=fx>cb ? mix(uBand.z,1.,pow(smoothstep(cb,.5,fx),.85)) : uBand.z;
  float d=mix(1.-vFace.w,h2,.45);
  float appear=smoothstep(d-.12,d+.12,uLoad*1.25-.1);
  // cool black glass: the reflections a touch colder than the body
  vec3 col=vec3(g)*vec3(.955,.97,1.)*fog*appear;
  // behind the column: the small far cells, drawn faintly by their edges and a hint of their facets (then out of focus)
  float inner=fx<cb?smoothstep(cb,cb*.4,fx):0.;
  float mesh=min(aa(vBary.x)+aa(vBary.y)+aa(vBary.z),1.);
  col+=vec3(.95,.97,1.)*uBand.w*inner*appear*(mesh*(.3+.7*h1)+.22*h3)*occ;

  vec3 em=vec3(0.);
  if(vE+vEv>.004){
    // energy: it comes up through the cracks between the blocks and runs along their edges; a face is only warmed
    float sw=exp(-be*3.);
    float lines=(aa(vBary.x)+aa(vBary.y)+aa(vBary.z));
    float x=clamp(.5*vE+.8*vEv,0.,1.);
    float crack=1.-smoothstep(0.,.4,vRock);
    // a large near face never fills with amber: the energy runs along its edges and only warms the face (amber is an event)
    em=ramp(x*(.5+.5*sw))*x*(.22+.45*sw)*1.4*mix(.35,1.,smoothstep(.05,.45,depth))*mix(.45,1.,crack);
    em+=ramp(.55+.4*vEv)*crack*crack*vEv*1.5;              // the glow of the cracks
    em+=ramp(.68+.32*vEv)*((l0+l1+l2)*1.5+lines*.45)*vEv*2.;
    em+=ramp(.3)*spec*gloss*vE*.5;
    em*=mix(.55,1.,fog)*appear;
    em*=mix(.45,1.,smoothstep(cb*.7,cb,fx));                // behind the layout column the reaction carries on, softer (and blurred)
  }
  if(uEmissive>.5){ o=vec4(em,1.); return; }
  col+=uBase+em;                                            // dithering happens once, in the final grade
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
uniform vec3 uPointer;        // local px of the pointer
uniform float uHover;
uniform float uNear;          // a neighbour in range: nearness of the pointer, 0..1
uniform vec3 uInkWarm;        // type on a card near the pointer: warmth, reach (px), share when only in range
in vec2 vLocal; in vec3 vBary; in float vGone; in float vTrans;
out vec4 o;
void main(){
  vec2 p=vLocal;
  float sd=uPanel>.5?sdTab(p):-40.;
  float inside=uPanel>.5?1.-smoothstep(-.7,.3,sd):1.;
  vec4 col=uPanel>.5?vec4(uPanelCol.rgb,1.)*uPanelCol.a*inside:vec4(0.);
  vec3 ph=photo(p,inside);
  // the photographs are objects on black: they light the void panel (the brighter of the two), so no box ever shows
  col.rgb=max(col.rgb,vec3(ph.x)*ph.y);
  col.rgb*=1.-ph.z;
  if(uPanel>.5){
    float frame=1.-smoothstep(0.,1.,abs(sd+.7)-.15);
    float k=(p.x/uSize.x+p.y/uSize.y)*.5;
    float g=mix(mix(.74,.3,smoothstep(.1,.9,k)),.62,smoothstep(.75,1.,k));
    col=mix(col,vec4(vec3(g),1.),frame*.62);
  }
  vec4 ink=uHasInk>.5?texture(uInk,p/uSize):vec4(0.);
  if(uPanel>.5&&ink.a>.003){
    // type keeps its weight and its single colour; near the pointer it takes a light, very diffuse amber
    vec2 d=p-uPointer.xy;
    float k=exp(-dot(d,d)/(uInkWarm.y*uInkWarm.y))*max(uHover,uNear*uInkWarm.z)*uInkWarm.x;
    ink.rgb*=mix(vec3(1.),vec3(1.,.84,.68),k);
  }
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
in vec2 centre;               // the cell's centre, local px
uniform vec2 uOrigin;
uniform float uSolid;
out vec2 vLocal; out vec3 vBary; flat out vec4 vCell; flat out float vE; out float vEv; out float vFade; flat out vec2 vCentre;
void main(){
  vec2 d=uOrigin+position;
  // light belongs to content that is present: it fades where scroll or loading take the structure apart
  vFade=(1.-smoothstep(.02,.3,fragAt(d.y-uScroll)*(1.-uSolid)))*(1.-loadAbs(delayAt(d,.5)));
  vLocal=position; vBary=bary; vCell=cell; vE=energy.x; vEv=energy.y; vCentre=centre;
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
uniform float uNear;          // a neighbour in range: nearness of the pointer, 0..1, eased
uniform float uTopo;          // density of the topology: 1 on a card, lower on a large panel (amber is an event)
uniform vec4 uBins[24];       // light along the outline, 96 segments
uniform vec3 uPointer;        // local px
uniform float uOwn;           // 1: on hover the photograph shows its own colours (already lit in the house palette)
uniform vec4 uWake;           // reach of the pointer over the cells (px): under it, from outside; share lit across the card; strength from outside
in vec2 vLocal; in vec3 vBary; flat in vec4 vCell; flat in float vE; in float vEv; in float vFade; flat in vec2 vCentre;
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
  vec2 dp=p-uPointer.xy;

  // 1 · the photograph lit from within: a warm grade of its own luminance, never a flat tint over it.
  //     A neighbour in range warms a little, on the side facing the pointer
  float lift=clamp(uHover*.72+Ev*.8,0.,1.)*uGain+uNear*.32*exp(-dot(dp,dp)/(uWake.x*uWake.x*2.6));
  float gA=ia*min(lift*(1.+.35*uOwn),1.)*(1.-ph.z*.5)*smoothstep(.015,.12,lum);   // black stays black: no visible image box
  // contained: the light lives on the crests of the object, its brightest core never burns out
  float l=pow(lum,1.05);
  vec3 graded=ramp(clamp(l*1.12+.1,0.,.84))*(l*1.7);
  graded*=1.+E*(.24*sweep-.08+.18*(h-.5));                 // each lit cell grades a little differently
  graded=mix(graded,phRGB*(.94+.3*E*sweep),uOwn);

  // 2 · one set of cells, of every size, gathered along the outline. Each cell has its own visibility: strong, faint,
  //     barely there, none. The pointer wakes them where it is (from outside too, on the side facing it) and the
  //     reaction travels through the same cells: one material, lit more or less
  float edgeK=vCell.w;
  float r=h11(seed*17.3+1.7), dens=mix(.32,1.,edgeK);
  float vis=r<dens*.14?1.:(r<dens*.36?.46:(r<dens*.64?.16:0.));
  vec2 dc=vCentre-uPointer.xy;
  float wake=uHover*uGain*(uWake.z+(1.-uWake.z)*exp(-dot(dc,dc)/(uWake.x*uWake.x)))+uNear*uWake.w*exp(-dot(dc,dc)/(uWake.y*uWake.y));
  float beat=.62+.38*sin(uTime*(.22+.3*h)+h2*6.283)*uMotion;
  // no still field of triangles: they show where the reaction passes and close to the pointer, nowhere else
  float L=clamp(vis*wake*beat*uTopo+E*(.45+.8*max(vis,.35)),0.,1.);
  float sat=.3+.7*h2;                                        // some cells deep amber, others close to neutral
  float fA=inside*L*(.05+.24*h)*(.3+.7*sweep)*(1.-ia*.4*smoothstep(.04,.3,lum));   // the object, not its box
  vec3 facet=ramp(.24+.44*L*sweep);
  facet=mix(vec3(dot(facet,vec3(.3333))),facet,sat)*(.45+.9*sweep);
  float edges=aa(vBary.x)*step(.45,h2)+aa(vBary.y)*step(.45,h3)+aa(vBary.z)*step(.45,h);
  vec3 wc=ramp(.6+.32*L);
  vec3 wire=mix(vec3(dot(wc,vec3(.3333))),wc,sat)*edges*L*(.12+.68*edgeK*edgeK)*inside;   // long seams of the large middle cells stay quiet

  // 3 · the outline lights by segment: a thin bright core and a soft local halo
  float Eb=bins(outlineAt(p));
  float core=1.-smoothstep(0.,1.25,abs(sd+.6));
  float halo=sd>0.?exp(-sd/7.5):exp(sd/16.)*.35;
  vec3 glow=ramp(.5+.36*Eb)*(core*Eb*1.7+halo*Eb*.9)*vFade;

  vec4 c=vec4(graded*gA,gA);
  c=vec4(facet*fA+c.rgb*(1.-fA),fA+c.a*(1.-fA));
  c.rgb+=wire;
  // type and icons are drawn once, by the content pass: light never covers them (and never thickens them)
  c*=(1.-ink.a)*vFade;
  if(uEmissive>.5){ o=vec4((graded*gA*smoothstep(.4,.9,lum)*.4+facet*fA*.7+wire)*(1.-ink.a)*vFade+glow,0.); return; }
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
uniform vec4 uTitle[6];       // the amber gradient, top to base: colour, luminance of its desaturated (idle) version
uniform vec3 uHot[3];         // where the range reaches: top, middle, base
uniform float uGain;
uniform float uHover;         // 0..1, eased
uniform vec3 uPointer;        // local px, range of the pointer (px)
uniform float uMicro;         // px, micro-lattice inside the glyphs
uniform float uLoad;
in vec2 vLocal; in vec3 vBary; flat in vec4 vCell; flat in float vE; in float vEv; in float vFade;
out vec4 o;
/* px from the nearest outline: negative inside a letter; beyond the texture, the distance to it is added */
float sdAt(vec2 p){
  vec2 uv=p/uSize, q=clamp(uv,0.,1.);
  return (texture(uDist,q).r-.5)*2.*uRange+length((uv-q)*uSize);
}
/* The idle gradient is the amber one desaturated: its grey gives back the amber colour at the same height. */
vec3 amberOf(float lum){
  vec3 c=uTitle[0].rgb;
  for(int i=1;i<6;i++){
    float hi=uTitle[i-1].w, lo=uTitle[i].w;
    if(lum<hi) c=mix(uTitle[i-1].rgb,uTitle[i].rgb,clamp((hi-lum)/max(hi-lo,1e-4),0.,1.));
  }
  return c;
}
void main(){
  vec2 p=vLocal;
  // two levels: on hover the whole block takes its amber gradient (base) and a golden lattice inside the letters; the
  // cells the range reaches and the reaction they start go warm yellow, the lattice denser there (local). Never a disc
  float base=clamp(uHover*uGain,0.,1.)*(.96+.04*sin(uTime*.8+p.x*.0025)*uMotion);
  float local=clamp(vEv*1.12+vE*.32,0.,1.15);
  // the warmth of the block decides everything: leaving, the whole look desaturates back into the idle gradient as one
  // piece (never cell by cell, never an overlay fading out). While the page builds, a few cells flash as they join
  float W=max(base,local*clamp((1.-uLoad)*3.,0.,1.)*.8);
  if(W<.004) discard;
  float sd=sdAt(p);
  if(sd>uRange) discard;
  vec2 uv=p/uSize;
  vec4 ink=texture(uInk,clamp(uv,0.,1.))*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
  float a=ink.a;
  float lum=a>.003?dot(ink.rgb/a,vec3(.299,.587,.114)):1.;
  float t=clamp((lum-uGray.x)/(uGray.y-uGray.x),0.,1.);   // 0 at the base of the block, 1 at its top
  vec3 idle=vec3(lum), amber=amberOf(lum);
  // in range: warm yellow, paler at the top, deeper toward the base; it climbs from the base as the range grows
  float fill=smoothstep(t-.3,t+.06,local*1.05);
  vec3 hot=t>.5?mix(uHot[1],uHot[0],(t-.5)*2.):mix(uHot[2],uHot[1],t*2.);
  // micro-facets of mixed sizes inside the letters, switched on and off slowly: across the block on hover, denser and
  // brighter where the range is
  float reach=max(local,base*.5);
  Tri m=tri(toL(p,uMicro),vec2(.62,.42));
  float mh=h11(m.id*5.1), mh2=h11(m.id*9.7);
  float th=.18+.6*mh*mh+.05*sin(uTime*(.16+.4*mh2)+mh*40.)*uMotion;
  float lit=smoothstep(th,th+.16,reach)*step(.2,mh2);
  vec3 facet=mix(ramp(.4+.22*reach*mh),hot,.25+.3*h11(m.id*2.7))*(.8+.35*h11(m.id*4.3)-.15*m.b.y);
  float wire=(1.-smoothstep(0.,1.,m.edge*uMicro*.8))*step(.45,h11(m.id*11.3));
  vec3 col=amber;
  col=mix(col,hot,fill);
  col=mix(col,facet,lit*mix(.4,.55,clamp(local,0.,1.)));
  col=mix(col,vec3(1.,.9,.74),wire*lit*.3);
  col=mix(idle,col,W);
  // the overlay replaces the base pass's type wherever the ink is (never adds coverage: the weight stays the same)
  float k=vFade;
  // warm light that follows each letter: a rim just inside the outline where the energy is, a soft glow outside
  float g=clamp(local*1.1+base*.4,0.,1.)*vFade*W;
  float rim=a*exp(-max(-sd,0.)/(uEm*.02));
  float outer=(1.-a)*exp(-max(sd,0.)/(uEm*.045))*(1.-smoothstep(uRange*.5,uRange,sd));
  vec3 rimC=ramp(.56+.2*g)*rim*local*vFade*.6*W;
  vec3 glow=ramp(.42+.2*g)*outer*(.04+.17*g)*vFade*W;
  // bloom: a touch of brilliance from the reached letters, the lattice and their rim, held low
  if(uEmissive>.5){ o=vec4(((hot*a*fill*.09+facet*a*lit*.07)*vFade+rimC*.24+glow*.3)*W,0.); return; }
  o=vec4(col*a*k+rimC*k+glow,k*min(1.,a*8.)+outer*(.05+.18*g)*vFade*W);
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
  vec4 c=texture(uTex,vUv)*.2270;
  c+=(texture(uTex,vUv+uStep*1.385)+texture(uTex,vUv-uStep*1.385))*.3162;
  c+=(texture(uTex,vUv+uStep*3.231)+texture(uTex,vUv-uStep*3.231))*.0703;
  o=c;
}`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uStrength;
in vec2 vUv; out vec4 o;
void main(){ o=vec4(texture(uTex,vUv).rgb*uStrength,0.); }`;

/**
 * Depth of field behind the layout column: from the column edge inward the sheet goes out of focus, first a little
 * then fully. Two passes over the sharp sheet already on screen: the first keeps the sharp share, the second adds
 * the blurred shares (premultiplied, exact also on a transparent canvas).
 */
export const BG_SOFT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMed;
uniform sampler2D uBig;
uniform vec2 uCol;            // column half-width (0..0.5), blur reach inside it (share of the half-width)
uniform float uPass;
in vec2 vUv; out vec4 o;
void main(){
  float fx=abs(vUv.x-.5);
  float w=smoothstep(uCol.x*1.04,uCol.x*(1.-uCol.y),fx);
  float sharp=clamp(1.-2.*w,0.,1.), big=clamp(2.*w-1.,0.,1.), med=1.-sharp-big;
  if(uPass<.5){ o=vec4(0.,0.,0.,1.-sharp); return; }
  o=texture(uMed,vUv)*med+texture(uBig,vUv)*big;
}`;

/**
 * The final grade: one pass from the HDR frame to the screen. Bloom and a warm horizontal streak are added where there is
 * energy; highlights roll off above the shoulder (the type below it keeps its exact colour); a slight chromatic
 * aberration toward the frame, vignette at the corners, fine film grain (none on pure black) and dithering last.
 */
export const GRADE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uStreak;
uniform vec2 uRes;            // drawing buffer, px
uniform vec4 uMix;            // bloom, streak, vignette, grain
uniform vec2 uLens;           // chromatic aberration at the corners (px), shoulder
uniform float uFrame;         // grain frame (24 steps a second), fixed with reduced motion
in vec2 vUv; out vec4 o;
float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 shoulder(vec3 c){
  float k=uLens.y;
  vec3 over=max(c-k,0.);
  return min(c,vec3(k))+(1.-k)*(1.-exp(-over/(1.-k)));
}
void main(){
  vec2 c=vUv-.5, asp=vec2(uRes.x/uRes.y,1.);
  float r=length(c*asp)/length(.5*asp);                  // 0 centre .. 1 corner
  vec4 s=texture(uScene,vUv);
  if(uLens.x>0.){
    vec2 off=normalize(c+1e-6)*uLens.x*smoothstep(.45,1.,r)*r/uRes;
    s.r=texture(uScene,vUv+off).r; s.b=texture(uScene,vUv-off).b;
  }
  vec3 col=s.rgb;
  if(uMix.x>0.) col+=texture(uBloom,vUv).rgb*uMix.x;
  if(uMix.y>0.) col+=texture(uStreak,vUv).rgb*vec3(1.,.82,.62)*uMix.y;
  col=shoulder(col);
  col*=1.-uMix.z*smoothstep(.42,1.05,r)*smoothstep(.42,1.05,r);
  float l=dot(col,vec3(.299,.587,.114));
  float grain=(hash(gl_FragCoord.xy+vec2(uFrame*17.31,uFrame*-9.73))-.5)*2.;
  col+=(grain*uMix.w*smoothstep(.004,.12,l)*(1.-.6*l)+(ign(gl_FragCoord.xy+uFrame*5.588)-.5)/255.)*s.a;   // nothing on a transparent pixel
  float a=s.a;
  if(a<1.) a=clamp(max(a,max(col.r,max(col.g,col.b))),0.,1.);
  o=vec4(max(col,0.),a);
}`;
