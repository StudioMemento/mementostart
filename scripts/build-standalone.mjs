import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
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
const scripts=[];
html=html.replace(/\s*<script defer src="((?:assets|navigation)\/[^\"]+\.js(?:\?[^\"]*)?)"><\/script>/g,(_,file)=>{
  scripts.push('<script>\n'+readFileSync(resolve(root,file.split('?')[0]),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');return '';
});
html=html.replace('</body>',scripts.join('\n')+'\n</body>');
const destination=resolve(root,'MEMENTO_START_V9_VFX_R4.html');
writeFileSync(destination,html);
console.log(destination+' ('+Buffer.byteLength(html)+' bytes)');
