import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import handler from '../netlify/functions/score.mjs';
const port = Number(process.env.PORT || 4173);
const publicRoot = path.resolve('public');
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/api/score') {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 1024) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
      const response = await handler(new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) }));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    const file = path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); res.end(); return; }
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' }[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Class Score: http://localhost:${port}`));
