// Checks every external link found in the built pages. Honest statuses:
//   OK            the page answered 2xx
//   BLOCKED(403)  the publisher refuses automated requests: the link is NOT verified by this tool (it is kept because the owner provided it); never bypassed
//   BROKEN        404/410/5xx or no answer: fails the check
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const urls = new Set();
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.html'))
      for (const m of fs.readFileSync(p, 'utf8').matchAll(/href="(https?:\/\/[^"]+)"/g))
        if (!m[1].includes('avivg7.github.io')) urls.add(m[1].replaceAll('&amp;', '&'));
  }
})(DIST);

let broken = 0;
for (const u of [...urls].sort()) {
  let status;
  try {
    const r = await fetch(u, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
      headers: { 'user-agent': 'Mozilla/5.0 (link check for digital-watch-webpage)' },
    });
    status =
      r.status >= 200 && r.status < 300
        ? `OK (${r.status})`
        : r.status === 403
          ? 'BLOCKED(403): not verified, kept because the owner provided it'
          : `BROKEN (${r.status})`;
  } catch (e) {
    status = `BROKEN (${e.name})`;
  }
  if (status.startsWith('BROKEN')) broken++;
  console.log(`${status.padEnd(60)} ${u}`);
}
process.exit(broken ? 1 : 0);
