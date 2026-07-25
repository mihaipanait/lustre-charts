/**
 * Tiny zero-dependency dev server for the Lustre repo.
 *   node tools/dev-server.mjs [port]
 *
 * - Serves the repository as static files (like `npx serve`).
 * - POST /__shot with a data-URL body saves a screenshot next to the repo
 *   (used by tooling / visual checks; harmless in normal use).
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SHOT_BODY_BYTES, screenshotPath } from './dev-server-utils.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const toolsDir = join(root, 'tools');
const port = Number(process.argv[2] || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, 'http://x');
    if (req.method === 'POST' && requestUrl.pathname === '/__shot') {
      let body = '';
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_SHOT_BODY_BYTES) {
          res.writeHead(413, { 'content-type': 'text/plain' }).end('screenshot too large');
          return;
        }
        body += chunk;
      }
      const m = body.match(/^data:image\/(png|jpeg);base64,(.+)$/s);
      if (!m) {
        res.writeHead(400).end('bad data url');
        return;
      }
      const name = requestUrl.searchParams.get('name') || 'shot';
      let file;
      try {
        file = screenshotPath(toolsDir, name, m[1] === 'png' ? 'png' : 'jpg');
      } catch {
        res.writeHead(400, { 'content-type': 'text/plain' }).end('invalid screenshot name');
        return;
      }
      await writeFile(file, Buffer.from(m[2], 'base64'));
      res.writeHead(200, { 'content-type': 'text/plain' }).end(file);
      return;
    }

    let path = decodeURIComponent(requestUrl.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(normalize(root))) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`lustre dev server → http://localhost:${port}`));
