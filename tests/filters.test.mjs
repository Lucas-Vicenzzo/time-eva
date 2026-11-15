import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const history=JSON.parse(fs.readFileSync('src/data/climate-history.json','utf8'));
const source=fs.readFileSync('src/js/04d_filters.js','utf8').split('function configureClimateFilters')[0];
const trendSource=fs.readFileSync('src/js/04b_history.js','utf8').match(/function seriesTrend\(series\)\{[^\n]+/)[0];
function context(parameter,filter,year){
 const sites=history.sites.filter(s=>s.series[parameter].some(p=>p.year===year));
 const m={unit:parameter==='T2M'?'°C':'mm/day',sites,points:sites.map(s=>[s.longitude,s.latitude,s.series[parameter].find(p=>p.year===year).value]),colorValues:sites.map(s=>{const base=s.series[parameter].filter(p=>p.year<=2010);return s.series[parameter].find(p=>p.year===year).value-base.reduce((a,p)=>a+p.value,0)/base.length;})};
 const ctx=vm.createContext({HISTORY:history,dataMode:'history',VAR:parameter==='T2M'?'T2M':'PREC',historyParameter:()=>parameter,tx:p=>p,m,filter});
 vm.runInContext(trendSource+'\n'+source+'\nclimateFilter=filter;result=globeMetric(m);',ctx);return ctx;
}
test('trend filters partition real samples and preserve their canonical values',()=>{
 for(const [parameter,up,down] of [['T2M','warming','cooling'],['PRECTOTCORR','wetter','drier']]){
  const rising=context(parameter,up,2025),falling=context(parameter,down,2025);
  assert.equal(rising.result.points.length+falling.result.points.length,history.sites.length);
  for(const ctx of [rising,falling]){
   assert.equal(ctx.result.points.length,ctx.result.colorValues.length);
   ctx.result.points.forEach((point,i)=>{assert.ok(ctx.m.points.includes(point));assert.ok(up===ctx.filter?ctx.result.colorValues[i]>0:ctx.result.colorValues[i]<0);});
  }
  assert.equal(context(parameter,up,1981).result.points.length,rising.result.points.length);
 }
});
test('annual anomaly filters respond to the timeline without treating equality as above or below',()=>{
 const a=context('T2M','above',1981),b=context('T2M','above',2025);assert.notEqual(a.result.points.length,b.result.points.length);
 assert.ok(b.result.colorValues.every(v=>v>0));assert.ok(context('T2M','below',1981).result.colorValues.every(v=>v<0));
 assert.equal(vm.runInContext("matchesClimateFilter('above',0,1)",a),false);
 assert.equal(vm.runInContext("matchesClimateFilter('below',0,-1)",a),false);
 assert.equal(vm.runInContext("matchesClimateFilter('warming',1,null)",a),false);
});
test('surface modes use measured annual levels or real decade slopes without hiding samples',()=>{
 const annual=context('T2M','all',2025),trend=context('T2M','trend',2025);
 assert.equal(annual.result.points.length,history.sites.length);assert.ok(annual.result.isLevel);
 annual.result.points.forEach((p,i)=>assert.equal(annual.result.colorValues[i],p[2]));
 assert.equal(trend.result.points.length,history.sites.length);assert.ok(trend.result.trendMode);
 assert.ok(trend.result.colorValues.every(Number.isFinite));assert.ok(trend.result.visualLabel.includes(history.start+'–'+history.end));
});
