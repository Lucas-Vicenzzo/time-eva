import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function boot(path='/demo/'){
 let now=1000,id=0;const timers=new Map(),events={},classes=new Set(),storage=new Map(),app={inert:false};
 const nodes=Object.fromEntries(['demoLoading','demoLoadingTitle','demoLoadingMessage','demoLoadingRetry','demoLoadingBack','demoLoadingRecovery'].map(key=>[key,{style:{},hidden:true,setAttribute(){},querySelector(){return{};},getBoundingClientRect(){return{};}}]));
 const context={URL,Date:{now:()=>now},matchMedia:()=>({matches:false}),sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},localStorage:{getItem:()=>null},location:{pathname:path,origin:'https://eva.test',href:'https://eva.test'+path,assign(url){context.destination=url;},reload(){}},document:{documentElement:{classList:{add:(...keys)=>keys.forEach(k=>classes.add(k)),remove:(...keys)=>keys.forEach(k=>classes.delete(k)),contains:k=>classes.has(k)}},getElementById:key=>nodes[key],querySelectorAll:()=>[app],addEventListener:(type,fn)=>events[type]=fn},addEventListener:(type,fn)=>events[type]=fn,requestAnimationFrame:fn=>fn(),setTimeout:(fn,delay)=>{const key=++id;timers.set(key,{fn,due:now+delay});return key;},clearTimeout:key=>timers.delete(key)};
 context.window=context;vm.runInNewContext(fs.readFileSync('src/assets/demo-transition.js','utf8'),context);
 const tick=ms=>{const target=now+ms;let entry;while((entry=[...timers.entries()].find(([,v])=>v.due<=target))){const [key,timer]=entry;timers.delete(key);now=timer.due;timer.fn();}now=target;};
 return{context,nodes,events,classes,app,tick};
}
test('demo remains covered until ready, then fades and restores interaction',()=>{
 const page=boot();page.events.DOMContentLoaded();page.tick(2000);assert.ok(page.classes.has('demo-booting'));assert.ok(page.app.inert);
 page.context.evaDemoReady();page.tick(0);assert.ok(page.classes.has('demo-revealing'));page.tick(280);assert.ok(!page.classes.has('demo-booting'));assert.equal(page.app.inert,false);
});
test('a missing ready signal reveals recovery controls instead of leaving a dead end',()=>{
 const page=boot();page.events.DOMContentLoaded();page.tick(12000);assert.equal(page.nodes.demoLoadingRecovery.hidden,false);assert.ok(page.classes.has('demo-booting'));
});
test('ordinary demo links transition, modified clicks remain native, and back restores landing interaction',()=>{
 const page=boot('/');const link={href:'https://eva.test/demo/',target:'',hasAttribute:()=>false};
 let prevented=false;const event={target:{closest:()=>link},button:0,preventDefault:()=>prevented=true};
 page.events.click({...event,ctrlKey:true});assert.equal(prevented,false);assert.equal(page.context.destination,undefined);
 page.events.click(event);assert.ok(prevented);assert.ok(page.classes.has('demo-booting'));page.tick(260);assert.equal(page.context.destination,link.href);
 page.events.pageshow({persisted:true});assert.ok(!page.classes.has('demo-booting'));assert.equal(page.app.inert,false);
});
