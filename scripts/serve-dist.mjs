// A tiny static server for dist/ that behaves like GitHub Pages for a PROJECT site: everything lives under the base path,
// "/dir/" serves "/dir/index.html", a missing path answers 404 with dist/404.html, and there is no SPA fallback and no redirect magic.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const BASE = '/digital-watch-webpage/';
const ROOT = path.resolve('dist');
const PORT = Number(process.env.PORT || 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

const send = (res, code, file) => {
  const ext = path.extname(file);
  res.writeHead(code, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    if (!p.startsWith(BASE)) return send(res, 404, path.join(ROOT, '404.html'));
    p = p.slice(BASE.length);
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) return send(res, 404, path.join(ROOT, '404.html'));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      file = path.join(file, 'index.html');
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, 200, file);
    return send(res, 404, path.join(ROOT, '404.html'));
  })
  .listen(PORT, '127.0.0.1', () => console.log(`serving dist at http://127.0.0.1:${PORT}${BASE}`));
