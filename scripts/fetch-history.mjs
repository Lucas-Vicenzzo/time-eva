import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizePower} from '../lib/climate.mjs';
const definitions=[
 ['congo','Congo',0,22],['paris','Paris',48.85,2.35],['london','London',51.5,-.1],['cairo','Cairo',30,31.2],['capetown','Cape Town',-33.9,18.4],['nairobi','Nairobi',-1.3,36.8],
 ['delhi','Delhi',28.6,77.2],['beijing','Beijing',39.9,116.4],['tokyo','Tokyo',35.7,139.7],['jakarta','Jakarta',-6.2,106.8],['sydney','Sydney',-33.9,151.2],['perth','Perth',-31.95,115.85],
 ['amazon','Amazon',-4.5,-60],['patagonia','Patagonia',-45,-70],['mexico','Mexico',19.4,-99.1],['california','California',36.8,-119.4],['newyork','New York',40.7,-74],['canada','Canada',56,-106],
 ['alaska','Alaska',64,-150],['greenland','Greenland',67,-45],['siberia','Siberia',60,100],['madagascar','Madagascar',-20,47],['pacific','Pacific',0,-150],['atlantic','Atlantic',20,-35]
];
export async function refreshHistory({output='src/data/climate-history.json',fetcher=fetch,end=new Date().getUTCFullYear()-1}={}){
 const sites=[];
 for(let i=0;i<definitions.length;i+=2){
  const batch=await Promise.all(definitions.slice(i,i+2).map(async([id,name,lat,lon])=>{
   const url=`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&start=1981&end=${end}&format=JSON`;
   let last;
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await fetcher(url,{signal:AbortSignal.timeout(40000)});
     if(!response.ok)throw new Error('HTTP '+response.status);
     const raw=await response.json(),parsed=normalizePower(raw,lat,lon,url);
     const rawSha256=createHash('sha256').update(JSON.stringify(raw)).digest('hex');
     for(const key of ['T2M','PRECTOTCORR']){
      const monthly=raw.properties.parameter[key];
      parsed.series[key]=parsed.series[key].filter(p=>p.year<=end&&Array.from({length:12},(_,m)=>monthly[`${p.year}${String(m+1).padStart(2,'0')}`]).every(v=>Number.isFinite(v)&&v!==raw.header?.fill_value));
      if(parsed.series[key].length<2)throw new Error('Insufficient complete annual observations');
     }
     return {id,name,...parsed,provenance:{rawSha256,hashEncoding:'SHA-256 of JSON.stringify(response)',processorVersion:1},period:{start:1981,end},description:'Annual means from complete calendar years; native model-grid point, not a regional average.'};
    }catch(error){last=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}
   }
   throw last;
  }));
  sites.push(...batch);console.log(`NASA history: ${sites.length}/${definitions.length} locations`);
 }
 const all=sites.flatMap(s=>Object.values(s.series).flat().map(p=>p.year));
 const candidate={version:1,source:'NASA POWER / MERRA-2',start:Math.min(...all),end:Math.max(...all),sites};
 const previous=JSON.parse(await fs.readFile(output,'utf8'));
 for(const old of previous.sites){
  const current=sites.find(s=>s.id===old.id);
  for(const key of ['T2M','PRECTOTCORR'])if(!current||old.series[key].some(p=>!current.series[key].some(q=>q.year===p.year)))throw new Error(`Historical coverage would shrink: ${old.id} ${key}`);
 }
 if(JSON.stringify(previous.sites.map(s=>s.series))===JSON.stringify(sites.map(s=>s.series)))return false;
 candidate.retrievedAt=new Date().toISOString();
 const directory=await fs.mkdtemp(path.join(path.dirname(output),'.history-'));
 try{const temporary=path.join(directory,'history.json');await fs.writeFile(temporary,JSON.stringify(candidate)+'\n');await fs.rename(temporary,output);}
 finally{await fs.rm(directory,{recursive:true,force:true});}
 return true;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await refreshHistory();
