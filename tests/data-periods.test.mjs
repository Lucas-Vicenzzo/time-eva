import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const evidence=JSON.parse(fs.readFileSync('src/data/earthdata-demo.json','utf8'));
const history=JSON.parse(fs.readFileSync('src/data/climate-history.json','utf8'));
test('timeline, file dates and quiz follow a future candidate period',()=>{
 const candidate=structuredClone(evidence);candidate.datasets.find(d=>d.id==='merra2').period='2027-02-01 / 2027-02-28';
 const ozone=candidate.datasets.find(d=>d.id==='sentinel5p');ozone.validBrazilBoundingBoxPixels=100;ozone.period='2027-02-02';
 const source=fs.readFileSync('src/js/01_data.js','utf8').replace(/^import .*;$/gm,'').replace('/*__EVIDENCE__*/',JSON.stringify(candidate)).replace('/*__HISTORY__*/',JSON.stringify({...history,end:2027}));
 const quiz=fs.readFileSync('src/js/05_class.js','utf8').split('const TEAMS=')[0];
 const ctx=vm.createContext({Intl,matchMedia:()=>({matches:false}),document:{getElementById(){}},localStorage:{getItem:()=>null}});
 const result=JSON.parse(vm.runInContext(source+'\n'+quiz+'\nJSON.stringify({ticks:historyTicks(),date:observationDate("PREC"),question:QS[1],ozoneAnswer:QS[3].ok,ozoneExplanation:QS[3].exp()})',ctx));
 assert.deepEqual(result.ticks,[1981,1990,2000,2010,2020,2027]);
 assert.ok(result.date.includes('2027'));assert.equal(result.question.o[0][1],'2027-02-01 / 2027-02-28');
 assert.ok(!result.question.q.includes('2026'));
 assert.equal(result.ozoneAnswer,'a');assert.ok(result.ozoneExplanation.includes('2027-02-02'));
 assert.ok(!result.ozoneExplanation.includes('2026'));
});
