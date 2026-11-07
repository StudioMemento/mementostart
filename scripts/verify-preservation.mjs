import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=JSON.parse(read('docs/source-baseline.json')),manifest=JSON.parse(read('assets/lowpoly/manifest.json'));
const html=read('index.html'),main=html.match(/<main[\s\S]*?<\/main>/)?.[0];
assert.ok(main,'Main content must exist');
assert.equal(manifest.assets.length,12,'All twelve content images must be replaced');
assert.equal(new Set(manifest.assets.map(a=>a.old)).size,12);assert.equal(new Set(manifest.assets.map(a=>a.new)).size,12);
let expectedMain=baseline.main;
for(const asset of manifest.assets){
  assert.ok(Object.hasOwn(baseline.hashes,asset.old),'Replacement must reference a known source image');
  assert.equal(expectedMain.split(`src="${asset.old}"`).length-1,1,asset.old+' source placement');
  expectedMain=expectedMain.replace(`src="${asset.old}"`,`src="${asset.new}"`);
}
expectedMain=expectedMain.replace('href="https://mementonav.vercel.app/#start"','href="https://mementostudio.it/#start" target="_top"');
function verifyMain(candidate){assert.equal(candidate,expectedMain,'Only twelve image sources and the explicit hub destination/target may change in semantic main');}
verifyMain(main);
// Positive controls exercise the actual checker, not a separate hash formula.
assert.throws(()=>verifyMain(main.replace('info@mementostudio.it','wrong@example.com')));
assert.throws(()=>verifyMain(main.replace('class="email-grid"','class="changed-grid"')));
assert.throws(()=>verifyMain(main.replace('width="960"','width="961"')));

// The navbar's only allowed change is monochrome resting state, amber hover/focus.
const styleChanges=[
  ['.mm-link[aria-current="page"] .mm-tile::before { opacity:1; }','.mm-link:is(:hover,:focus-visible) .mm-tile::before { opacity:1; }'],
  ['.mm-link[aria-current="page"] .mm-tile::after { opacity:1; }','.mm-link:is(:hover,:focus-visible) .mm-tile::after { opacity:1; }'],
  ['.mm-link[aria-current="page"] .mm-symbol { opacity:1; filter:grayscale(0) saturate(1.12) brightness(calc(1.15 * var(--mm-icon-gain,1))); }','.mm-link:is(:hover,:focus-visible) .mm-symbol { opacity:1; filter:grayscale(0) saturate(1.12) brightness(calc(1.15 * var(--mm-icon-gain,1))); }'],
  ['.mm-link:not([aria-current="page"]):hover .mm-symbol { opacity:1; filter:grayscale(.75) brightness(calc(1.04 * var(--mm-icon-gain,1))); }','.mm-link:not([aria-current="page"]):hover .mm-symbol { opacity:1; filter:grayscale(0) brightness(calc(1.04 * var(--mm-icon-gain,1))); }']
];
function originalNav(source){for(const [before,after] of styleChanges){assert.equal(source.split(after).length-1,1,'Expected one precise navbar style change');source=source.replace(after,before);}return source;}
const allowedBehavior=new Set(['assets/start.js','assets/config.js']);
// Superseded photos need not ship in V10. Their original placement, dimensions,
// classes and copy are still enforced by the exact main comparison above;
// verify-package checks the actual replacement WebP files and embedded bytes.
const replacedPhotos=new Set(manifest.assets.map(a=>a.old));
let preserved=0;
for(const [path,expected] of Object.entries(baseline.hashes)){
  if(allowedBehavior.has(path)||replacedPhotos.has(path))continue;
  const raw=readFileSync(new URL(path,root));
  const input=['navigation/styles.mjs','navigation/start.bundle.js'].includes(path)?originalNav(raw.toString()):raw;
  const check=bytes=>assert.equal(sha(bytes),expected,path+' preservation');check(input);
  assert.throws(()=>check(Buffer.concat([Buffer.from(input),Buffer.from('mutation-control')])));
  preserved++;
}

// Exercise actual Start event handlers without network access or external navigation.
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  fire(k,event={}){for(const fn of this.listeners[k]||[])fn({target:this,...event})}
  append(...e){this.children.push(...e)} replaceChildren(...e){this.children=e}
  setAttribute(k,v){this.attributes[k]=v} getAttribute(k){return this.attributes[k]??null}
  querySelector(s){return s==='iframe'?this.children.find(c=>c.tagName==='iframe')||null:this.slots?.[s]||null}
  focus(){this.focused=true} showModal(){this.open=true} close(){this.open=false;this.fire('close')}
}
const configContext={window:{}};runInNewContext(read('assets/config.js'),configContext);const config=configContext.window.MEMENTO_CONFIG;
for(const [key,value] of Object.entries({email:'info@mementostudio.it',projectEmail:'mementoxdesign@gmail.com',phone:'+393285454661',phoneLabel:'+39 328 545 4661',whatsapp:'393285454661',hubUrl:'https://mementostudio.it/#start'}))assert.equal(config[key],value,key);
function behavior(override={}){
  const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id)};
  const opener=new Element(),policies=['privacy','cookies','studio','preferences'].map(kind=>{const e=new Element('button');e.dataset.policy=kind;return e});
  for(const id of ['mm-email-project','mm-email-studio'])get(id).slots={'.email-address':new Element()};
  const map=new Element('iframe');map.src='https://www.google.com/maps/embed';get('mm-map-frame').append(map);
  const document={body:new Element(),activeElement:opener,getElementById:get,createElement:t=>new Element(t),querySelector:()=>new Element(),querySelectorAll:s=>s==='[data-policy]'?policies:[]};
  const opened=[];runInNewContext(read('assets/start.js'),{document,window:{MEMENTO_CONFIG:{...config,...override},open:(...args)=>opened.push(args)},location:{href:'https://mementostart.vercel.app/'},URL});
  return {get,policies,opened,opener};
}
for(const bad of ['', ' ',undefined,null,'javascript:alert(1)','http://example.com','https://user:pass@example.com']){
  const s=behavior({privacyUrl:bad,cookiePolicyUrl:bad,legalUrl:bad,hubUrl:bad});
  for(const kind of ['privacy','cookies','studio']){s.policies.find(e=>e.dataset.policy===kind).fire('click');assert.equal(s.opened.length,0,'Invalid optional URL must show local content');assert.equal(s.get('mm-dialog').open,true);assert.ok(s.get('mm-dialog-body').children.length>=3);s.get('mm-dialog-close').fire('click');assert.equal(s.get('mm-dialog').open,false);assert.equal(s.opener.focused,true);}
  assert.equal(s.get('mm-explore').href,'https://mementostudio.it/#start');assert.equal(s.get('mm-explore').target,'_top');
  assert.equal(s.get('mm-phone-link').href,'tel:+393285454661');assert.equal(s.get('mm-email-studio').href,'mailto:info@mementostudio.it');assert.match(s.get('mm-whatsapp-link').href,/^https:\/\/wa.me\/393285454661\?text=/);
}
const valid=behavior({privacyUrl:'https://mementostudio.it/privacy'});valid.policies[0].fire('click');assert.deepEqual(valid.opened[0],['https://mementostudio.it/privacy','_blank','noopener,noreferrer']);
console.log(`PRESERVATION_CONFIRMED: exact semantic main with 12 approved image replacements and official CTA; ${preserved} source assets/modules preserved (2 navbar style normalizations); policy and contact behavior verified.`);
