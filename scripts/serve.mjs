// Local preview including the same server-side EVA handler used by Vercel.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import handler from '../api/eva.js';
import climateHandler from '../api/climate.js';
const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp' };
http.createServer(async (req, res) => {
  const route=req.url.split('?')[0];
  if (route === '/api/eva' || route === '/api/climate') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 16000) { res.writeHead(413).end(); return; }
    }
    req.body = body || undefined;
    res.status = c => { res.statusCode = c; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    return (route==='/api/climate'?climateHandler:handler)(req,res);
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : ['/demo','/demo/'].includes(url.pathname) ? '/demo/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('EVA preview: http://127.0.0.1:' + (process.env.PORT || 3000)));
