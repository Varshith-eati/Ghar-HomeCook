import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../out/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const account = (await import('./preview-account.mjs')).createPreviewAccount();
const origin = 'http://127.0.0.1:' + (process.env.PORT || 3000);
http.createServer(async(req,res)=>{try{if(await account(req,res,origin)) return;const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if((await stat(file)).isDirectory())file=path.join(file,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Ghar preview: http://127.0.0.1:${process.env.PORT||3000}`));
