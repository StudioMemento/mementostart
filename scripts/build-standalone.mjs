import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { resolve,dirname,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const data=path=>'data:'+mime[extname(path)]+';base64,'+readFileSync(path).toString('base64');
let html=readFileSync(root+'index.html','utf8');
const licenses=['Inter-OFL.txt','Tabler-LICENSE.txt'].map(file=>file+'\n'+readFileSync(root+'docs/'+file,'utf8')).join('\n\n');
html=html.replace('</head>','<script type="text/plain" data-third-party-licenses>\n'+licenses.replaceAll('</script','<\\/script')+'\n</script>\n</head>');
html=html.replace(/\s*<link rel="preload"[^>]*>/g,'');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>{
 const full=resolve(root,file);let css=readFileSync(full,'utf8');
 css=css.replace(/url\(['"]?([^'"\)]+)['"]?\)/g,(__,asset)=>'url("'+data(resolve(dirname(full),asset))+'")');
 return '<style>\n'+css+'\n</style>';
});
html=html.replace(/(src|href)="(assets\/[^\"]+\.(?:webp|svg))"/g,(_,attr,path)=>attr+'="'+data(resolve(root,path))+'"');
// The synchronous watchdog stays before first paint; deferred application scripts move to body end.
html=html.replace('<script src="assets/vfx/boot.js"></script>','<script>\n'+readFileSync(root+'assets/vfx/boot.js','utf8')+'\n</script>');
const inline=[];
html=html.replace(/\s*<script defer src="(assets\/[^\"]+\.js)"><\/script>/g,(_,file)=>{inline.push('<script>\n'+readFileSync(root+file,'utf8').replaceAll('</script','<\\/script')+'\n</script>');return '';});
const overlayModules=['core.mjs','blur.mjs','styles.mjs','icon-assets.mjs','memento-paths.mjs','wordmark.mjs','icons.mjs','navbar.mjs','child.mjs'];
const overlay=overlayModules.map(file=>{
 let source=readFileSync(root+'navigation/'+file,'utf8');
 source=source.replace(/^import\s+.+?\s+from\s+['"].+?['"];\s*$/gm,'').replace(/\bexport (const|function|class) /g,'$1 ');
 source=source.replace(/new URL\(['"]\.\/assets\/([^'"]+)['"],\s*import\.meta\.url\)\.href/g,(_,asset)=>JSON.stringify(data(root+'navigation/assets/'+asset.split('?')[0])));
 if(source.includes('import.meta'))throw Error('Unresolved module URL: '+file);
 return '// navigation/'+file+'\n'+source;
}).join('\n');
const bootstrap=/<script defer src="\/navigation\/bootstrap\.js\?v=12\.0\.0"\s+data-memento-page="([^"]+)"\s+data-memento-hub="([^"]+)"><\/script>/;
if(!bootstrap.test(html))throw Error('Expected configured overlay bootstrap.');
html=html.replace(bootstrap,(_,page,hub)=>inline.join('\n')+'\n<script>\n(()=>{\n"use strict";\n'+overlay.replace(/<\/script/gi,'<\\/script')+'\ninstallChild('+JSON.stringify({page,hub})+');\n})();\n</script>');
const destination=resolve(root,'MEMENTO_START_VFX_V2.html');
writeFileSync(destination,html);console.log(destination+' ('+Buffer.byteLength(html)+' bytes)');
