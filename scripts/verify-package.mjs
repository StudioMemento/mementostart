import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),run=script=>{const r=spawnSync(process.execPath,[new URL(script,root).pathname],{cwd:root,encoding:'utf8'});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stdout+r.stderr);return r.stdout;};
console.log(run('scripts/check.mjs'));console.log(run('scripts/build-standalone.mjs'));
const html=readFileSync(new URL('MEMENTO_START_V11_VFX_CALIBRATED.html',root),'utf8');
assert.ok(html.includes('MementoStartVFX'));assert.ok(html.includes('VFXMath'));
assert.equal((html.match(/(?:src|href)="(?:assets|navigation)\//g)||[]).length,0,'Standalone must not depend on local asset files');
assert.ok(html.includes('data:font/woff2;base64,'));assert.ok(html.includes('data:image/webp;base64,'));
const source=readFileSync(new URL('index.html',root),'utf8');
for(const file of ['vfx.css','vfx-math.js','vfx.js','polish.css'])assert.ok(source.includes('assets/'+file),file);
assert.equal((source.match(/src="assets\/vfx.js"/g)||[]).length,1,'One VFX bootstrap');
assert.ok(existsSync(new URL('navigation/start.bundle.js',root)));
const manifest=JSON.parse(readFileSync(new URL('assets/lowpoly/manifest.json',root),'utf8'));
function webpSize(b){
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  for(let offset=12;offset+8<=b.length;){
    const kind=b.toString('ascii',offset,offset+4),size=b.readUInt32LE(offset+4),p=offset+8;
    assert.ok(p+size<=b.length,'Valid WebP chunk length');
    if(kind==='VP8X')return [1+b.readUIntLE(p+4,3),1+b.readUIntLE(p+7,3)];
    if(kind==='VP8 '){assert.equal(b.subarray(p+3,p+6).toString('hex'),'9d012a');return [b.readUInt16LE(p+6)&0x3fff,b.readUInt16LE(p+8)&0x3fff];}
    if(kind==='VP8L'){assert.equal(b[p],0x2f);const v=b.readUInt32LE(p+1);return [1+(v&0x3fff),1+((v>>>14)&0x3fff)];}
    offset=p+size+(size%2);
  }
  throw Error('Missing WebP image chunk');
}
let bytes=0;
for(const a of manifest.assets){
  const b=readFileSync(new URL(a.new,root));assert.equal(b.length,a.bytes,a.new+' byte size');
  assert.deepEqual(webpSize(b),[a.width,a.height],a.new+' actual dimensions');
  const img=[...source.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes(`src="${a.new}"`));
  assert.equal(img.length,1,a.new+' exactly one content image');assert.ok(img[0].includes(`width="${a.width}"`));assert.ok(img[0].includes(`height="${a.height}"`));
  assert.ok(!source.includes(a.old),'Old image may remain as baseline but must not be rendered');
  assert.ok(html.includes('data:image/webp;base64,'+b.toString('base64')),a.new+' embedded bytes');bytes+=b.length;
}
assert.throws(()=>webpSize(Buffer.alloc(32)),'Malformed asset control must fail');
assert.equal(manifest.assets.length,12);assert.ok(html.includes('href="https://mementostudio.it/#start" target="_top"'));
console.log(`PACKAGE_CONFIRMED: V11 standalone, 12 real WebP replacements (${bytes} bytes), original image dimensions, one engine and official CTA.`);
