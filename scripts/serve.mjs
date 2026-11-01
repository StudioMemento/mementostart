import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const args=process.argv.slice(2), port=Number(args[args.indexOf('--port')+1])||4173;
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');let p=resolve(root,'.'+decodeURIComponent(u.pathname));if(!p.startsWith(root+sep)&&p!==root){res.writeHead(403).end();return;}if((await stat(p)).isDirectory())p=resolve(p,'index.html');res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(p));}catch{res.writeHead(404).end('Not found');}}).listen(port,'0.0.0.0',()=>console.log('Memento Start preview on port '+port));
