import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/V23-preservation.json'), 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
for (const [file, hash] of Object.entries(manifest.files)) assert.equal(sha(readFileSync(resolve(root, file))), hash, `Changed: ${file}`);
const request = JSON.parse(readFileSync(resolve(root, 'docs/V25-request.json'), 'utf8'));
const preset = readFileSync(resolve(root, 'src/background/preset.ts'), 'utf8');
for (const [key, value] of Object.entries(request.supplied_background_props)) {
 const match = preset.match(new RegExp(`\\b${key}:\\s*([^,\\n]+)`));
 assert.ok(match, `Missing: ${key}`);
 assert.equal(match[1].trim(), typeof value === 'string' ? `'${value}'` : String(value), `Changed parameter: ${key}`);
}
let shader = readFileSync(resolve(root, 'src/vfx/shaders.ts'), 'utf8').replace(
 'uniform vec2 uCanvas; // document origin Y and overscanned canvas height\nvec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uCanvas.x))/vec2(uView.x,uCanvas.y)*2.-1.; return vec4(c.x,-c.y,0.,1.); }',
 'vec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uScroll))/uView*2.-1.; return vec4(c.x,-c.y,0.,1.); }');

// Normalize only the three intentional V25 shader changes; all other shader text must match V23.
shader = shader.replace('uniform float uPhotoColor;    // no-hover devices show photographs in full colour at rest\n','')
 .replace('col.rgb=max(col.rgb,mix(vec3(ph.x),phRGB,uPhotoColor)*ph.y);','col.rgb=max(col.rgb,vec3(ph.x)*ph.y);')
 .replace("  // V25: no film grain or animated dithering; the photographic/text grade stays clean.\n","  float l=dot(col,vec3(.299,.587,.114));\n  float grain=(hash(gl_FragCoord.xy+vec2(uFrame*17.31,uFrame*-9.73))-.5)*2.;\n  col+=(grain*uMix.w*smoothstep(.004,.12,l)*(1.-.6*l)+(ign(gl_FragCoord.xy+uFrame*5.588)-.5)/255.)*s.a;   // nothing on a transparent pixel\n");
// V26 touch only: signed colour delta keeps coverage/desktop shaders unchanged.
shader = shader.replace('uniform float uTouch;        // local short-lived chain; never warms the entire title\n','')
 .replace('  float W0=max(base,local*clamp((1.-uLoad)*3.,0.,1.)*.8);\n  float W=max(W0,clamp(local,0.,1.)*uTouch);','  float W=max(base,local*clamp((1.-uLoad)*3.,0.,1.)*.8);')
 .replace('  float cov=a*k*W0;','  float cov=a*k*W;')
 .replace('  // Touch changes existing ink by its colour delta, preserving anti-aliased coverage.\n  o=vec4(col*cov+(col-idle)*a*k*(W-W0)+rimC*k+glow,cov);','  o=vec4(col*cov+rimC*k+glow,cov);');
assert.equal(sha(shader), manifest.original_shader_sha256, 'Unexpected surface shader modification');
for (const file of ['public/navigation/child.mjs', 'public/navigation/start.bundle.js']) {
 const source=readFileSync(resolve(root,file),'utf8');
 assert.ok(source.includes('{ passive: !embedded }'), `Standalone wheel must be passive: ${file}`);
}
const html=readFileSync(resolve(root,'index.html'),'utf8');
assert.ok(html.includes('height:var(--memento-nav-height,100dvh)'));
assert.ok(html.includes('(function syncNavViewport('));
assert.ok(html.indexOf('MEMENTO_OVERLAY_START') < html.indexOf('<div id="root">'));
assert.ok(!html.includes('file:///'));
assert.ok(Buffer.byteLength(html)<90000,'Critical navbar HTML must stay small');
assert.ok(readFileSync(resolve(root,'public/navigation/start.bundle.js')).length<100000,'Navigation bundle must use optimized icons');
console.log('PRESERVATION_OK: original assets/effects, V25 preset and initial viewport navbar verified');
