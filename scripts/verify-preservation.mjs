import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/V23-preservation.json'), 'utf8'));
const sha = data => createHash('sha256').update(data).digest('hex');
for (const [file, hash] of Object.entries(manifest.files)) assert.equal(sha(readFileSync(resolve(root, file))), hash, `Changed: ${file}`);
const preset = readFileSync(resolve(root, 'src/background/preset.ts'), 'utf8');
for (const [key, value] of Object.entries(manifest.supplied_background_props)) {
 const match = preset.match(new RegExp(`\\b${key}:\\s*([^,\\n]+)`));
 assert.ok(match, `Missing: ${key}`);
 assert.equal(match[1].trim(), typeof value === 'string' ? `'${value}'` : String(value), `Changed parameter: ${key}`);
}
const shader = readFileSync(resolve(root, 'src/vfx/shaders.ts'), 'utf8').replace(
 'uniform vec2 uCanvas; // document origin Y and overscanned canvas height\nvec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uCanvas.x))/vec2(uView.x,uCanvas.y)*2.-1.; return vec4(c.x,-c.y,0.,1.); }',
 'vec4 clipOf(vec2 doc){ vec2 c=(doc-vec2(0.,uScroll))/uView*2.-1.; return vec4(c.x,-c.y,0.,1.); }');
assert.equal(sha(shader), manifest.original_shader_sha256, 'Unexpected surface shader modification');
for (const file of ['public/navigation/child.mjs', 'public/navigation/start.bundle.js']) {
 const source=readFileSync(resolve(root,file),'utf8');
 assert.ok(source.includes('{ passive: !embedded }'), `Standalone wheel must be passive: ${file}`);
}
console.log('PRESERVATION_OK: assets, core effects, supplied parameters and passive navigation verified');
