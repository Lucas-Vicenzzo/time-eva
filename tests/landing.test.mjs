import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const landing=fs.readFileSync('dist/index.html','utf8');
test('home presents the imported branded landing and clear demo links while demo retains the application',()=>{
 assert.ok(landing.includes('EVA Classroom'));assert.ok(landing.includes('Pergunte ao planeta.'));
 assert.ok((landing.match(/href="\/demo\/"/g)||[]).length>=3);assert.ok(landing.includes('/assets/eva-classroom-logo.png'));
 assert.ok(!landing.includes('new THREE.WebGLRenderer'));assert.ok(fs.readFileSync('dist/demo/index.html','utf8').includes('new THREE.WebGLRenderer'));
 assert.ok(!landing.includes('mailto:contato@exemplo.com'));assert.ok(!landing.includes('Nome do Autor'));
});
test('landing anchors and bundled resources resolve without missing prototype documents',()=>{
 const ids=new Set([...landing.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const match of landing.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(match[1]),'missing anchor '+match[1]);
 for(const match of landing.matchAll(/(?:src|href)="(\/(?:assets\/[^"?#]+|earthdata-demo\.json))"/g))assert.ok(fs.existsSync(path.join('dist',match[1])),'missing asset '+match[1]);
 assert.ok(!/href="docs\//.test(landing));
 const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
 assert.equal(routes.find(r=>r.source==='/demo').destination,'/demo/index.html');
 assert.equal(routes.find(r=>r.source==='/demo/').destination,'/demo/index.html');
});
