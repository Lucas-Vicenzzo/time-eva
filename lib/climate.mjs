import history from '../src/data/climate-history.json' with {type:'json'};
export const historyPeriod={start:history.start,end:history.end};
const cache=new Map();
export function normalizePower(raw,latitude,longitude,sourceUrl){
 const parameters=raw.properties?.parameter;
 if(!parameters?.T2M||!parameters?.PRECTOTCORR)throw new Error('invalid_nasa_response');
 const series={};
 for(const key of ['T2M','PRECTOTCORR'])series[key]=Object.entries(parameters[key]).filter(([date,value])=>/^\d{4}13$/.test(date)&&Number.isFinite(value)&&value!==raw.header?.fill_value).map(([date,value])=>({year:Number(date.slice(0,4)),value})).sort((a,b)=>a.year-b.year);
 if(series.T2M.length<2||series.PRECTOTCORR.length<2)throw new Error('insufficient_data');
 return {latitude,longitude,source:'NASA POWER / MERRA-2',sourceUrl,series,units:{T2M:'°C',PRECTOTCORR:'mm/day'}};
}
export function validLocation(latitude,longitude){return typeof latitude==='number'&&typeof longitude==='number'&&Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=-90&&latitude<=90&&longitude>=-180&&longitude<=180;}
export async function getClimateSeries(latitude,longitude){
 if(!validLocation(latitude,longitude))throw new Error('invalid_location');
 const anchor=history.sites.find(s=>Math.abs(s.latitude-latitude)<.001&&Math.abs(s.longitude-longitude)<.001);
 if(anchor)return anchor;
 const key=latitude.toFixed(3)+','+longitude.toFixed(3),known=cache.get(key);
 if(known&&Date.now()-known.time<86400000)return known.value;
 const url=new URL('https://power.larc.nasa.gov/api/temporal/monthly/point');
 for(const [k,v] of Object.entries({parameters:'T2M,PRECTOTCORR',community:'AG',longitude,latitude,start:history.start,end:history.end,format:'JSON'}))url.searchParams.set(k,String(v));
 const response=await fetch(url,{signal:AbortSignal.timeout(22000)});
 if(!response.ok)throw new Error(response.status===429?'nasa_quota':'nasa_unavailable');
 const result=normalizePower(await response.json(),latitude,longitude,url.href);
 if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{value:result,time:Date.now()});return result;
}
export function linearTrend(series){
 if(series.length<2)return null;const n=series.length,meanX=series.reduce((s,p)=>s+p.year,0)/n,meanY=series.reduce((s,p)=>s+p.value,0)/n;
 const denominator=series.reduce((s,p)=>s+(p.year-meanX)**2,0);
 return denominator?series.reduce((s,p)=>s+(p.year-meanX)*(p.value-meanY),0)/denominator:null;
}
