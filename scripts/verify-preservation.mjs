import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseline=JSON.parse(readFileSync(new URL('../docs/source-baseline.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8');
assert.equal(html.match(/<main[\s\S]*?<\/main>/)[0],baseline.main,'The original semantic main must be byte-identical');
for(const [path,expected]of Object.entries(baseline.hashes))assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),expected,path);
// Positive control: prove this checker rejects a changed asset.
const [controlPath,expected]=Object.entries(baseline.hashes)[0];
assert.notEqual(createHash('sha256').update(readFileSync(new URL(controlPath,root))).update('changed').digest('hex'),expected);
console.log(`PRESERVATION_CONFIRMED: main and ${Object.keys(baseline.hashes).length} original files.`);
