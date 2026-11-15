import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/eva.js';
import evidence from '../src/data/earthdata-demo.json' with { type: 'json' };
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;}};}
const body={question:'O que medimos?',dataset:'merra2',metric:'drydays',language:'pt'};
test('extracted sources have quality-filtered finite observations and three unique originals',()=>{
 assert.equal(evidence.uniqueFiles,new Set(evidence.files.map(f=>f.sha256)).size);assert.ok(evidence.files.length>=3);
 const ozone=evidence.datasets.find(d=>d.id==='sentinel5p');assert.ok(Number.isInteger(ozone.brazilBoundingBoxPixels)&&ozone.brazilBoundingBoxPixels>=0);
 if(ozone.validBrazilBoundingBoxPixels!==undefined)assert.ok(ozone.validBrazilBoundingBoxPixels>=0&&ozone.validBrazilBoundingBoxPixels<=ozone.brazilBoundingBoxPixels);
 for(const d of evidence.datasets)for(const m of Object.values(d.metrics)){
  assert.ok(m.points.length>0);assert.ok(m.stats.count>=m.points.length);
  for(const [lon,lat,v] of m.points){assert.ok(lon>=-180&&lon<=180);assert.ok(lat>=-90&&lat<=90);assert.ok(Number.isFinite(v));assert.ok(v>=m.stats.min-.001&&v<=m.stats.max+.001);}
 }
});
test('API validates requests, keeps key private and handles Gemini boundaries',async()=>{
 const originalFetch=global.fetch,originalKey=process.env.GEMINI_API_KEY;
 try{
  delete process.env.GEMINI_API_KEY;
  let res=response();await handler({method:'GET'},res);assert.equal(res.body.ai,false);assert.equal(res.body.provider,'gemini');
  res=response();await handler({method:'POST',body:'{'},res);assert.equal(res.code,400);
  res=response();await handler({method:'POST',body:{...body,metric:'fake'}},res);assert.equal(res.code,400);
  res=response();await handler({method:'POST',body},res);assert.equal(res.code,503);
  res=response();await handler({method:'DELETE'},res);assert.equal(res.code,405);
  process.env.GEMINI_API_KEY='test-secret';
  global.fetch=async(url,opts)=>{
   assert.ok(url.includes(':generateContent'));assert.equal(opts.headers['x-goog-api-key'],'test-secret');
   const request=JSON.parse(opts.body);assert.ok(request.systemInstruction.parts[0].text.includes(String(evidence.datasets.find(d=>d.id==='merra2').metrics.drydays.regions.amazonia.value)));
   assert.ok(!request.contents[0].parts[0].text.includes('test-secret'));
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Resposta baseada no recorte.'}]}}]})};
  };
  res=response();await handler({method:'POST',body},res);assert.equal(res.code,200);assert.equal(res.body.text,'Resposta baseada no recorte.');assert.ok(!JSON.stringify(res.body).includes('test-secret'));
  global.fetch=async()=>({ok:false,status:429});res=response();await handler({method:'POST',body},res);assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'30');
  global.fetch=async()=>({ok:true,json:async()=>({candidates:[]})});res=response();await handler({method:'POST',body},res);assert.equal(res.code,502);
  global.fetch=async()=>{throw new DOMException('timeout','TimeoutError');};res=response();await handler({method:'POST',body},res);assert.equal(res.code,504);
 }finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;}
});

test('selected measurements are resolved from canonical data, not client numbers',async()=>{
 const originalFetch=global.fetch,originalKey=process.env.GEMINI_API_KEY;
 try{
  process.env.GEMINI_API_KEY='test-secret';
  const bad=response();await handler({method:'POST',body:{...body,pointIndex:-1}},bad);assert.equal(bad.code,400);
  const wrongRegion=response();await handler({method:'POST',body:{...body,referenceRegion:'made-up'}},wrongRegion);assert.equal(wrongRegion.code,400);
  global.fetch=async(url,opts)=>{
   const instruction=JSON.parse(opts.body).systemInstruction.parts[0].text;
   assert.ok(instruction.includes('selectedReferenceCell'));assert.ok(instruction.includes('nordeste'));assert.ok(instruction.includes('selectedObservation'));
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Fonte confirmada.'}]}}]})};
  };
  const valid=response();await handler({method:'POST',body:{...body,referenceRegion:'nordeste',pointIndex:0}},valid);assert.equal(valid.code,200);
 }finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;}
});
test('educational answers allow hypotheses while forbidding unverified local causal claims',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-secret';
 try{
  global.fetch=async(url,opts)=>{const request=JSON.parse(opts.body),instruction=request.systemInstruction.parts[0].text;
   assert.ok(instruction.includes('propose plausible hypotheses'));assert.ok(instruction.includes('not a proven local diagnosis'));
   assert.ok(instruction.includes('what extra evidence'));assert.ok(!instruction.includes('statistical significance or causation.'));
   assert.equal(request.contents.at(-1).parts[0].text,'O que pode ter ocasionado esse aumento?');
   assert.equal(request.contents[0].parts[0].text,'E na escola?');
   return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Há hipóteses que podemos investigar.'}]}}]})};
  };
  const res=response();await handler({method:'POST',body:{...body,question:'O que pode ter ocasionado esse aumento?',history:[{role:'user',text:'E na escola?'}]}},res);
  assert.equal(res.code,200);assert.equal(res.body.provider,'gemini');assert.ok(res.body.model);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
test('ozone explanations use the selected swath metadata without fixed Brazil coverage',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY='test-secret';
 try{
  global.fetch=async(url,opts)=>{
   const instruction=JSON.parse(opts.body).systemInstruction.parts[0].text;
   assert.ok(instruction.includes('validBrazilBoundingBoxPixels'));
   assert.ok(!instruction.includes('this supplied swath does not cover Brazil'));
   assert.ok(instruction.includes(evidence.datasets.find(d=>d.id==='sentinel5p').period));
   return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Coverage follows this swath.'}]}}]})};
  };
  const res=response();await handler({method:'POST',body:{question:'Does this cover Brazil?',dataset:'sentinel5p',metric:'ozone',language:'en'}},res);
  assert.equal(res.code,200);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
