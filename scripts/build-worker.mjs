import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'out');
const assets = {};
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.txt':'text/plain; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.woff2':'font/woff2' };

async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await collect(file); continue; }
    const url = '/' + path.relative(output, file).split(path.sep).join('/');
    const bytes = await readFile(file);
    assets[url] = [types[path.extname(file)] || 'application/octet-stream', bytes.toString('base64')];
  }
}
await collect(output);
const kitchen = await readFile(path.join(root,'worker/kitchens.mjs'),'utf8');
const api = (await readFile(path.join(root, 'worker/account.mjs'), 'utf8')).replace("import { handleKitchen } from './kitchens.mjs';", kitchen).replace('export async function handleAccount', 'async function handleAccount');
const handler = await readFile(path.join(root, 'worker/serve.mjs'), 'utf8');
await mkdir(path.join(root, 'dist/server'), { recursive: true });
await mkdir(path.join(root, 'dist/.openai'), { recursive: true });
await copyFile(path.join(root, '.openai/hosting.json'), path.join(root, 'dist/.openai/hosting.json'));
await writeFile(path.join(root, 'dist/server/index.js'), api + '\nconst assets = ' + JSON.stringify(assets) + ';\n' + handler);
console.log('Packaged account API and ' + Object.keys(assets).length + ' frontend assets.');
