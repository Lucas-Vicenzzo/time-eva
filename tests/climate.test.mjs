import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePower,getClimateSeries,linearTrend,validLocation} from '../lib/climate.mjs';
import climateHandler from '../api/climate.js';
import evaHandler from '../api/eva.js';
import history from '../src/data/climate-history.json' with {type:'json'};
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(value){this.body=value;return this;}});
test('24 global locations have real annual observations for a usable timeline',()=>{
 assert.equal(history.sites.length,24);assert.ok(history.sites.some(s=>s.longitude>100));assert.ok(history.sites.some(s=>s.longitude< -100));
 for(const s of history.sites)for(const key of ['T2M','PRECTOTCORR']){assert.equal(s.series[key].length,45);assert.equal(s.series[key][0].year,1981);assert.equal(s.series[key].at(-1).year,2025);assert.ok(s.series[key].every(p=>Number.isFinite(p.value)&&p.value!==-999));}
});
test('annual parser omits missing values and monthly samples without inventing years',()=>{
 const j={header:{fill_value:-999},properties:{parameter:{T2M:{198101:30,198113:20,198213:-999,198313:22},PRECTOTCORR:{198113:4,198213:-999,198313:5}}}};
 const parsed=normalizePower(j,0,22,'https://power.larc.nasa.gov');assert.deepEqual(parsed.series.T2M,[{year:1981,value:20},{year:1983,value:22}]);assert.equal(linearTrend(parsed.series.T2M),1);
 assert.equal(validLocation(NaN,0),false);assert.equal(validLocation(91,0),false);assert.equal(validLocation(0,181),false);
});
test('history endpoint validates coordinates and serves known points without a network call',async()=>{
 let res=response();await climateHandler({method:'GET',url:'/api/climate'},res);assert.equal(res.code,400);
 res=response();await climateHandler({method:'GET',url:'/api/climate?lat=91&lon=0'},res);assert.equal(res.code,400);
 res=response();await climateHandler({method:'GET',url:'/api/climate?lat=0&lon=22'},res);assert.equal(res.code,200);assert.equal(res.body.series.T2M.length,45);
});
test('EVA receives the authoritative historical series and selected year',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-secret';
 try{global.fetch=async(url,opts)=>{const instruction=JSON.parse(opts.body).systemInstruction.parts[0].text;assert.ok(instruction.includes('annualSeries'));assert.ok(instruction.includes('linearTrendPerDecade'));assert.ok(instruction.includes('"selectedYear":1995'));return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Histórico confirmado.'}]}}]})};};
 const res=response();await evaHandler({method:'POST',body:{question:'Qual a mudança?',dataset:'power-history',metric:'T2M',latitude:0,longitude:22,selectedYear:1995,language:'pt'}},res);assert.equal(res.code,200);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
