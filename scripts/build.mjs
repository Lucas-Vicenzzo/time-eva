// Gera dist/index.html: junta o HTML, os módulos JS (em ordem) e os dados num único arquivo.
// Uso: npm run build   ·   npm run dev (reconstrói ao salvar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'src');
const require = createRequire(import.meta.url);
const atlas = path.dirname(require.resolve('world-atlas/package.json'));
const topoClient = path.join(path.dirname(require.resolve('topojson-client/package.json')), 'dist/topojson-client.min.js');

function build() {
  const t0 = Date.now();
  let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
  const js = fs.readdirSync(path.join(src, 'js')).filter(f => f.endsWith('.js')).sort()
    .map(f => `// ---- ${f} ----\n` + fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
  const evidence = JSON.stringify(JSON.parse(fs.readFileSync(path.join(src, 'data/earthdata-demo.json'), 'utf8')));
  const countries = JSON.parse(fs.readFileSync(path.join(atlas, 'countries-110m.json'), 'utf8'));
  countries.objects = { countries: countries.objects.countries };
  html = html
    .replace('/*__LAND__*/', () => fs.readFileSync(path.join(atlas, 'land-50m.json'), 'utf8'))
    .replace('/*__COUNTRIES__*/', () => JSON.stringify(countries))
    .replace('/*__TOPO__*/', () => fs.readFileSync(topoClient, 'utf8'))
    .replace('/*__APP__*/', () => js.replace('/*__EVIDENCE__*/', () => evidence).replace('/*__HISTORY__*/', () => fs.readFileSync(path.join(src, 'data/climate-history.json'), 'utf8')));
  const loading = fs.readFileSync(path.join(src, 'landing/loading.html'), 'utf8');
  html = html.replace('<!--__DEMO_LOADING__-->', () => loading);
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist/demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/demo/index.html'), html);
  fs.writeFileSync(path.join(root, 'dist/index.html'), fs.readFileSync(path.join(src, 'landing/index.html'), 'utf8').replace('<!--__DEMO_LOADING__-->', () => loading));
  fs.copyFileSync(path.join(src, 'data/earthdata-demo.json'), path.join(root, 'dist/earthdata-demo.json'));
  fs.cpSync(path.join(src, 'assets'), path.join(root, 'dist/assets'), { recursive: true });
  console.log(`✓ landing + dist/demo/index.html (${(html.length / 1024).toFixed(0)} KB) em ${Date.now() - t0} ms`);
}
build();
if (process.argv.includes('--watch')) {
  console.log('Observando src/ …');
  let timer; fs.watch(src, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 150); });
}
