import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const history=JSON.parse(fs.readFileSync('src/data/climate-history.json','utf8'));
const fn=fs.readFileSync('src/js/06b_personality.js','utf8').split('function applyExplorationIntent')[1];
function run(question){const ctx=vm.createContext({VIEW:'monitor',HISTORY:history,historySite:history.sites[0],year:2025,dataMode:'history',VAR:'T2M',render(){},flyRegion(){},setEvaMood(){}});vm.runInContext('function applyExplorationIntent'+fn+'\napplyExplorationIntent('+JSON.stringify(question)+');',ctx);return ctx;}
test('asking about causes or comparisons does not silently change the selected year or location',()=>{
 const ctx=run('O que pode ter ocasionado o aumento em Paris entre 1981 e 2025?');assert.equal(ctx.year,2025);assert.equal(ctx.historySite.id,history.sites[0].id);
 const command=run('Mostre Paris em 1995');assert.equal(command.year,1995);assert.equal(command.historySite.name,'Paris');
 const comparison=run('Mostre a comparação de Paris em 1981 e 2025');assert.equal(comparison.year,2025);
});
