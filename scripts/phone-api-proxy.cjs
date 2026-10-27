// Temporary phone preview: expose catalog, images and sign-in only.
const http = require('node:http');
const catalog = /^\/api\/v1\/(?:products(?:\/(?:search-suggestions|[\w-]+))?|categories|collections|banners|stores(?:\/nearest)?)\/?$/;
function allowed(method, path) {
  if (method === 'GET') return catalog.test(path) || path === '/api/v1/me/profile' || /^\/uploads\/[\w./-]+$/.test(path);
  return method === 'POST' && /^\/api\/v1\/auth\/(?:login|refresh)$/.test(path);
}
const server = http.createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (path.includes('..') || !allowed(req.method, path)) {
    res.writeHead(403, { 'Content-Type': 'application/json' }).end(JSON.stringify({ success: false, message: 'Endpoint unavailable in phone preview' }));
    return;
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: 4000, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:4000' }, timeout: 15000 }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
server.listen(4001, '127.0.0.1', () => console.log('Phone preview proxy listening on localhost:4001'));
