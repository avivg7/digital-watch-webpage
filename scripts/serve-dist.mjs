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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
};

const send = (res, code, file, req) => {
  const ext = path.extname(file);
  const type = TYPES[ext] || 'application/octet-stream';
  const size = fs.statSync(file).size;
  // GitHub Pages answers byte-range requests (video seeking, Safari playback depend on them), so this server does too
  const range = code === 200 && req && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
    const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
    if (start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache',
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(code, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size, 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    // outside the project path GitHub Pages answers with ITS OWN 404, never with this site's 404.html
    if (!p.startsWith(BASE)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    p = p.slice(BASE.length);
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) return send(res, 404, path.join(ROOT, '404.html'), req);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      file = path.join(file, 'index.html');
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, 200, file, req);
    return send(res, 404, path.join(ROOT, '404.html'), req);
  })
  .listen(PORT, '127.0.0.1', () => console.log(`serving dist at http://127.0.0.1:${PORT}${BASE}`));
