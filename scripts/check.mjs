import { readFileSync,existsSync,readdirSync,statSync } from 'node:fs';
import { resolve,dirname,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=readFileSync(root+'index.html','utf8');
const issues=[];
const local=(value,base)=>{if(/^(?:data:|https?:|mailto:|tel:|#)/.test(value))return;const file=resolve(value.startsWith('/')?root:base,value.replace(/^\//,'').split(/[?#]/)[0]);if(!existsSync(file))issues.push('Missing asset: '+file);};
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))local(m[1],root);
for(const filename of ['start.css','gradients.css','navigation-insets.css']){const css=readFileSync(root+'assets/'+filename,'utf8');for(const m of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))local(m[1],root+'assets');}
const ids=[...html.matchAll(/\s+id="([^"]+)"/g)].map(m=>m[1]);
for(const id of new Set(ids))if(ids.filter(x=>x===id).length>1)issues.push('Duplicate id: '+id);
for(const m of html.matchAll(/(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"]+)"/g))for(const id of m[1].split(' '))if(!ids.includes(id))issues.push('Unresolved accessibility reference: '+id);
function walk(dir){return readdirSync(dir).flatMap(n=>{const p=resolve(dir,n);return statSync(p).isDirectory()?walk(p):[p];});}
for(const file of [...walk(root+'assets'),...walk(root+'navigation')].filter(p=>['.js','.mjs'].includes(extname(p)))){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(check.status)issues.push(check.stderr);}
for(const ramp of JSON.parse(readFileSync(root+'docs/gradient-verification.json','utf8')))if(!ramp.anchorsExact||ramp.maxChannelError>ramp.limit)issues.push('Invalid DNA ramp: '+ramp.name);
const deployment=JSON.parse(readFileSync(root+'vercel.json','utf8'));if(deployment.outputDirectory!=='.')issues.push('Static output must be project root.');
if(issues.length){console.error(issues.join('\n'));process.exit(1);}
console.log('Passed: local assets, unique IDs, accessible references, JS syntax, DNA gradient tolerance, static output.');
