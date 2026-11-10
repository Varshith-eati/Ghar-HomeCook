// The build includes the Next.js export and account handler in one Worker module.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleAccount(request, env); }
      catch { return reply({ error: 'Your account could not be loaded. Please try again.' }, 503); }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405});
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response(null, {status: 400}); }
    const key = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    let asset = assets[key];
    if (!asset && assets[key + '/index.html']) {
      url.pathname += '/';
      return Response.redirect(url.toString(), 308);
    }
    const status = asset ? 200 : 404;
    asset ||= assets['/404.html'];
    if (!asset) return new Response(null, {status: 404});
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset[1]), ch => ch.charCodeAt(0));
    return new Response(body, {status, headers: {
      'Content-Type': asset[0], 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': status === 404 ? 'no-store' : key.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'private, no-cache'
    }});
  }
};
