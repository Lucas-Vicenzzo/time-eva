import fs from 'node:fs/promises';
const definitions=[
 ['congo','Congo',0,22],['paris','Paris',48.85,2.35],['london','London',51.5,-.1],['cairo','Cairo',30,31.2],['capetown','Cape Town',-33.9,18.4],['nairobi','Nairobi',-1.3,36.8],
 ['delhi','Delhi',28.6,77.2],['beijing','Beijing',39.9,116.4],['tokyo','Tokyo',35.7,139.7],['jakarta','Jakarta',-6.2,106.8],['sydney','Sydney',-33.9,151.2],['perth','Perth',-31.95,115.85],
 ['amazon','Amazon',-4.5,-60],['patagonia','Patagonia',-45,-70],['mexico','Mexico',19.4,-99.1],['california','California',36.8,-119.4],['newyork','New York',40.7,-74],['canada','Canada',56,-106],
 ['alaska','Alaska',64,-150],['greenland','Greenland',67,-45],['siberia','Siberia',60,100],['madagascar','Madagascar',-20,47],['pacific','Pacific',0,-150],['atlantic','Atlantic',20,-35]
];
export function parsePower(j,latitude,longitude){
 const raw=j.properties?.parameter;if(!raw?.T2M||!raw?.PRECTOTCORR)throw new Error('NASA response has no required parameters');
 const series={};for(const key of ['T2M','PRECTOTCORR'])series[key]=Object.entries(raw[key]).filter(([date,value])=>/^\d{4}13$/.test(date)&&Number.isFinite(value)&&value!==j.header.fill_value).map(([date,value])=>({year:Number(date.slice(0,4)),value})).sort((a,b)=>a.year-b.year);
 if(series.T2M.length<2||series.PRECTOTCORR.length<2)throw new Error('Insufficient valid annual observations');
 return {latitude,longitude,series,source:'NASA POWER / MERRA-2',period:{start:1981,end:2025},units:{T2M:'°C',PRECTOTCORR:'mm/day'},description:'Annual mean air temperature at 2 m and annual mean daily precipitation; native model grid, point request. Missing values omitted.'};
}
const sites=[];
for(let i=0;i<definitions.length;i+=2){
 const batch=await Promise.all(definitions.slice(i,i+2).map(async([id,name,lat,lon])=>{
  const url=`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&start=1981&end=2025&format=JSON`;
  let last;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!r.ok)throw new Error('HTTP '+r.status);const raw=await r.json();return {id,name,...parsePower(raw,lat,lon),sourceUrl:url};}catch(e){last=e;}}
  throw last;
 }));sites.push(...batch);console.log(`NASA history: ${sites.length}/${definitions.length} locations`);
 await fs.writeFile('src/data/climate-history.json',JSON.stringify({version:1,source:'NASA POWER / MERRA-2',start:1981,end:2025,sites})+'\n');
}
