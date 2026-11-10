import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const origin = 'https://ghar.example';
for (const path of ['/', '/login/', '/choose-role/', '/customer/profile/', '/master-chefs/profile/']) {
  const page = await worker.fetch(new Request(origin + path), {});
  assert.equal(page.status, 200, path);
  const html = await page.text();
  if (path === '/login/') {
    assert.match(html, /<a[^>]+href="\/signin-with-chatgpt\?[^"]+"[^>]*>Continue with ChatGPT/);
  }
  for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    assert.doesNotMatch(src, /%5[BbDd]|[\[\]]/, 'Use fixed page paths so login assets have ordinary filenames');
    const script = await worker.fetch(new Request(new URL(src, origin)), {});
    assert.equal(script.status, 200, path + ' references a missing script at ' + src);
    assert.match(script.headers.get('content-type'), /javascript/, src);
  }
}
const missing = await worker.fetch(new Request(origin + '/_next/static/missing.js'), {});
assert.equal(missing.status, 404);
assert.equal(missing.headers.get('cache-control'), 'no-store');
console.log('All five account and dashboard routes can load their published scripts.');
