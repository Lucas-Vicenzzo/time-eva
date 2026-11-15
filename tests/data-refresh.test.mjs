import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {refreshHistory} from '../scripts/fetch-history.mjs';
const raw=()=>{
 const parameters={T2M:{},PRECTOTCORR:{}};
 for(const values of Object.values(parameters))for(const year of [2023,2024,2025])for(let month=1;month<=13;month++)values[`${year}${String(month).padStart(2,'0')}`]=year;
 return {header:{fill_value:-999},properties:{parameter:parameters}};
};
async function fixture(run){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'eva-refresh-')),output=path.join(directory,'history.json');
 await fs.writeFile(output,JSON.stringify({sites:[]}));
 try{await run(output);}finally{await fs.rm(directory,{recursive:true,force:true});}
}
test('refresh publishes complete years once and leaves unchanged data untouched',()=>fixture(async output=>{
 const fetcher=async()=>({ok:true,json:async()=>raw()});
 assert.equal(await refreshHistory({output,fetcher,end:2025}),true);
 const content=await fs.readFile(output,'utf8'),data=JSON.parse(content);
 assert.equal(data.sites.length,24);assert.equal(data.end,2025);
 assert.equal(await refreshHistory({output,fetcher,end:2025}),false);
 assert.equal(await fs.readFile(output,'utf8'),content);
}));
test('incomplete latest year cannot replace existing complete historical coverage',()=>fixture(async output=>{
 const fetcher=async()=>({ok:true,json:async()=>raw()});
 await refreshHistory({output,fetcher,end:2025});
 const content=await fs.readFile(output,'utf8');
 const incomplete=async()=>({ok:true,json:async()=>{const data=raw();delete data.properties.parameter.T2M['202512'];return data;}});
 await assert.rejects(refreshHistory({output,fetcher:incomplete,end:2025}),/coverage would shrink/);
 assert.equal(await fs.readFile(output,'utf8'),content);
}));
test('failed download preserves the last published file',()=>fixture(async output=>{
 const before=await fs.readFile(output,'utf8');
 await assert.rejects(refreshHistory({output,fetcher:async()=>{throw new Error('offline');},end:2025}),/offline/);
 assert.equal(await fs.readFile(output,'utf8'),before);
}));
test('future complete years extend the range without admitting a partial year',()=>fixture(async output=>{
 const fetcher=async()=>({ok:true,json:async()=>{
  const data=raw();
  for(const values of Object.values(data.properties.parameter))for(let month=1;month<=13;month++)values[`2026${String(month).padStart(2,'0')}`]=42;
  return data;
 }});
 await refreshHistory({output,fetcher,end:2026});
 const data=JSON.parse(await fs.readFile(output,'utf8'));
 assert.equal(data.end,2026);assert.equal(data.sites[0].series.T2M.at(-1).year,2026);
 assert.equal(data.sites[0].provenance.rawSha256.length,64);
}));
