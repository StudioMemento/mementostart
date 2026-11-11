export const CHANNEL = 'memento:navigation';
export const VERSION = 2;
export const PUBLIC_ORIGIN = 'https://mementostudio.it';
export const LEGACY_HUB = 'https://mementonav.vercel.app';
export const DEFAULT_HUB = PUBLIC_ORIGIN;
export const STATIONS = Object.freeze([
  { id:'memento', label:'Memento', path:'/studio', url:'https://mementostudio.vercel.app/', stageId:'s01_memento' },
  { id:'services', label:'Services', path:'/services', url:'https://mementoservizi.vercel.app/', stageId:'s02_services' },
  { id:'projects', label:'Projects', path:'/projects', url:'https://mementoportfolio.vercel.app/', stageId:'s03_projects' },
  { id:'levelup', label:'LevelUp', path:'/levelup', url:'https://mementolevelup.vercel.app/', stageId:'s04_levelup' },
  { id:'start', label:'Start', path:'/start', url:'https://mementostart.vercel.app/', stageId:'s05_start' }
]);
export const station = id => STATIONS.find(s=>s.id===id);
export const indexOf = id => STATIONS.findIndex(s=>s.id===id);
const CONTEXT_KEYS = new Set(['from','experience','idea','project','service','bundle','goal']);
export function safeContext(search='') {
  const input=new URLSearchParams(search), out=new URLSearchParams();
  for(const [key,value] of input) if(CONTEXT_KEYS.has(key)&&value.length<=2000) out.set(key,value);
  return out.toString();
}
export function safeHash(hash='') {
  return typeof hash==='string'&&hash.length<512&&/^#[a-zA-Z0-9_\-/?.=&%]*$/.test(hash)?hash:'';
}
export function readRoute(input) {
  const u=new URL(input, DEFAULT_HUB), slug=u.pathname.split('/').filter(Boolean)[0];
  const s=STATIONS.find(x=>x.path.split('/')[1]===slug || (slug==='memento'&&x.id==='memento'));
  if(s) return {id:s.id,view:'page',search:safeContext(u.search),hash:safeHash(u.hash)};
  return {id:station(u.hash.slice(1))?.id||'memento',view:'world',search:'',hash:''};
}
export function routePath(route) {
  const s=station(route.id);if(!s)throw Error('Unknown station');
  if(route.view!=='page')return s.id==='memento'?'/':'/#'+s.id;
  const q=safeContext(route.search);return s.path+(q?'?'+q:'')+safeHash(route.hash);
}
// Public navigation never inherits the technical iframe/preview host.
export function publicRouteURL(route) { return new URL(routePath(route), PUBLIC_ORIGIN).href; }
export function contentURL(route) {
  const s=station(route.id);if(!s)throw Error('Unknown station');
  const u=new URL(s.url);u.search=safeContext(route.search);u.searchParams.set('mementoEmbed','1');u.hash=safeHash(route.hash);return u.href;
}
export function sessionEnvelope(id,sessionId,type,payload={}) {
  return {channel:CHANNEL,version:VERSION,station:id,sessionId,type,payload};
}
export function validMessage(event,record) {
  const d=event?.data;
  return Boolean(record && event.source===record.source && event.origin===record.origin &&
    d?.channel===CHANNEL && d.version===VERSION && d.station===record.id &&
    typeof d.sessionId==='string' && d.sessionId===record.sessionId &&
    typeof d.type==='string' && d.payload && typeof d.payload==='object' && !Array.isArray(d.payload));
}
export function trustedParent(origin, hub=DEFAULT_HUB) {
  try {
    if(origin===new URL(hub).origin)return true;
    if([PUBLIC_ORIGIN,'https://www.mementostudio.it',LEGACY_HUB].includes(origin))return true;
    const u=new URL(origin);
    return u.protocol==='https:'&&/^mementonav-[a-z0-9-]+-studio-memento-s-projects\.vercel\.app$/.test(u.hostname);
  }catch{return false;}
}
export function navigationLink(href,base,hub=DEFAULT_HUB) {
  let u,b;try{u=new URL(href,base);b=new URL(base);}catch{return null;}
  if(!['http:','https:'].includes(u.protocol))return null;
  // Keep in-page anchors under the page's control, including on the public domain.
  if(u.origin===b.origin && u.pathname===b.pathname && u.hash && !(u.pathname==='/' && station(u.hash.slice(1))))return null;
  const globalOrigins=new Set([PUBLIC_ORIGIN,LEGACY_HUB,'https://www.mementostudio.it',new URL(hub).origin]);
  if(globalOrigins.has(u.origin)) {
    const path=u.pathname.split('/').filter(Boolean)[0];
    if(!path)return {id:station(u.hash.slice(1))?.id||'memento',view:'world',search:'',hash:''};
    const target=STATIONS.find(s=>s.path.split('/')[1]===path||s.id===path);
    return target?{id:target.id,view:'page',search:safeContext(u.search),hash:safeHash(u.hash)}:null;
  }
  const target=STATIONS.find(s=>new URL(s.url).origin===u.origin);
  if(!target||!['/','/index.html'].includes(u.pathname))return null;
  // A gallery, dialog or anchor in the current application belongs to that application.
  if(u.origin===b.origin && u.pathname===b.pathname && u.hash)return null;
  return {id:target.id,view:'page',search:safeContext(u.search),hash:safeHash(u.hash)};
}
