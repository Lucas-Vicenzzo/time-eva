import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const evidence=JSON.parse(fs.readFileSync('src/data/earthdata-demo.json','utf8'));
function questions(language){
 const source=fs.readFileSync('src/js/01_data.js','utf8').replace(/^import .*;$/gm,'').replace('/*__EVIDENCE__*/',JSON.stringify(evidence)).replace('/*__HISTORY__*/',fs.readFileSync('src/data/climate-history.json','utf8'));
 const quiz=fs.readFileSync('src/js/05_class.js','utf8').split('const TEAMS=')[0];
 const context={Intl,matchMedia(){return {matches:false};},document:{getElementById(){}},localStorage:{getItem(){return language;}}};
 return vm.runInNewContext(source+'\n'+quiz+'\nJSON.stringify(QS.map(q=>({q:q.q,o:q.o,ok:q.ok,show:q.show,exp:q.exp()})))',context);
}
test('bilingual quiz answers and source selections match the supplied observations',()=>{
 for(const lang of ['pt','en']){
  const qs=JSON.parse(questions(lang));assert.equal(qs.length,5);
  for(const q of qs){assert.ok(q.o.some(([key])=>key===q.ok));assert.equal(new Set(q.o.map(([key])=>key)).size,4);assert.ok(q.exp);}
  const first=qs[0],dry=evidence.datasets.find(d=>d.id==='merra2').metrics.drydays.regions;
  assert.equal(dry[first.ok].value,Math.max(...Object.values(dry).map(c=>c.value)));
 }
});
test('built page uses the original WebGL globe and embedded observations without old trend data',()=>{
 const html=fs.readFileSync('dist/demo/index.html','utf8');
 assert.ok(html.includes('new THREE.WebGLRenderer'));assert.ok(html.includes('const EVIDENCE='));
 assert.ok(!html.includes('const POWER ='));assert.ok(!html.includes('TR.brasil'));
 assert.ok(!/\/\*__\w+__\*\//.test(html));
 assert.ok(html.includes('new THREE.Points'));
 assert.ok(html.includes('NASA POWER'));
 assert.ok(!html.includes("ringsOf(brazil).forEach(r=>traceRing(x,r,W,H,true)); x.stroke();"));
});
