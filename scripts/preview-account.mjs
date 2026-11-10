// Explicit local-only QA account. This module is never included in the deployed Worker.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { handleAccount } from '../worker/account.mjs';

export function createPreviewAccount() {
  const folder = new URL('../.local/', import.meta.url);
  mkdirSync(folder, {recursive:true});
  const db = new DatabaseSync(new URL('profiles.sqlite', folder).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='ghar_profiles'").get()) {
    db.exec(readFileSync(new URL('../drizzle/0000_ghar_profiles.sql', import.meta.url),'utf8'));
  }
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='ghar_kitchens'").get()) db.exec(readFileSync(new URL('../drizzle/0001_ghar_kitchens.sql',import.meta.url),'utf8'));
  if (!db.prepare("SELECT name FROM pragma_table_info('ghar_kitchens') WHERE name='chef_id'").get()) {
    db.exec('BEGIN');
    try {
      db.exec(readFileSync(new URL('../drizzle/0002_restaurant_menus.sql',import.meta.url),'utf8'));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const photoDir = new URL('photos/',folder);
  mkdirSync(photoDir,{recursive:true});
  const fileFor = key => new URL(key.replace('/','-'),photoDir);
  const sessions = new Set();
  const env = { BUCKET:{put(key,data){writeFileSync(fileFor(key),data)},get(key){return existsSync(fileFor(key))?{body:readFileSync(fileFor(key))}:null}}, DB: { prepare(sql) { return { bind(...args) { const statement = db.prepare(sql); return {
    all: () => ({results:statement.all(...args)}), run: () => ({meta:statement.run(...args)})
  }; } }; } } };
  return async function previewAccount(req, res, origin) {
    const path = new URL(req.url, origin).pathname;
    const token = (req.headers.cookie || '').split(';').map(c=>c.trim()).find(c=>c.startsWith('ghar_preview='))?.slice(13);
    if (path === '/__preview/signin' && req.method === 'POST' && req.headers.origin === origin) {
      const session = randomUUID();
      sessions.add(session);
      res.writeHead(303, {Location:'/choose-role/', 'Set-Cookie':'ghar_preview='+session+'; HttpOnly; SameSite=Strict; Path=/'});
      res.end(); return true;
    }
    if (path === '/__preview/signout') {
      sessions.delete(token);
      res.writeHead(303, {Location:'/login/', 'Set-Cookie':'ghar_preview=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict'});
      res.end(); return true;
    }
    if (!path.startsWith('/api/')) return false;
    if (!sessions.has(token)) {
      res.writeHead(401, {'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({preview:true})); return true;
    }
    const headers = new Headers({'oai-authenticated-user-id':'local-preview','oai-authenticated-user-email':'preview@example.test','oai-authenticated-user-full-name':'Preview User'});
    for (const name of ['content-type','origin']) if (req.headers[name]) headers.set(name,req.headers[name]);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(new URL(req.url,origin),{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined});
    const response = await handleAccount(request,env);
    if (response.headers.get('content-type') === 'image/jpeg') {
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return true;
    }
    const body = await response.json();
    if (path === '/api/account') body.preview = true;
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(JSON.stringify(body));return true;
  };
}
