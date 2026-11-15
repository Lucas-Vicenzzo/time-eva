import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function demo(){
 let now=0,next=0;
 const timers=new Map();
 function node(){
  const classes=new Set(),events={};
  return {value:'',hidden:false,disabled:false,textContent:'',attributes:{},dataset:{},classes,
   classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
   setAttribute(key,value){this.attributes[key]=value;},
   addEventListener(type,handler){events[type]=handler;},
   click(){events.click?.();},focus(){this.focused=true;events.focus?.();}};
 }
 const nodes=Object.fromEntries(['room-code','team-name','join-button','join-screen','room-screen','question-screen','question-title','answer-status','screen-label','demo-status','replay'].map(id=>[id,node()]));
 const answers=['A','B','C','D'].map(letter=>Object.assign(node(),{dataset:{answer:letter}}));
 const context={document:{getElementById:id=>nodes[id],querySelectorAll:()=>answers},setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync('src/join/join.js','utf8'),context);
 function tick(ms){const until=now+ms;let pending;while((pending=[...timers.entries()].find(([,t])=>t.at<=until))){const[id,t]=pending;timers.delete(id);now=t.at;t.fn();}now=until;}
 return {nodes,answers,tick,timers};
}

test('interactive demo waits for field taps, joining and an explicit answer choice',()=>{
 const {nodes,answers,tick,timers}=demo();
 tick(10000);assert.equal(nodes['room-code'].value,'');assert.ok(nodes['question-screen'].hidden);
 nodes['join-button'].click();assert.equal(timers.size,0);assert.equal(nodes['join-screen'].hidden,false);
 nodes['room-code'].click();assert.equal(nodes['room-code'].value,'K7Q24');assert.ok(nodes['join-button'].disabled);
 nodes['team-name'].click();assert.equal(nodes['team-name'].value,'Capivaras');assert.equal(nodes['join-button'].disabled,false);
 tick(10000);assert.ok(nodes['room-screen'].hidden);
 nodes['join-button'].click();nodes['join-button'].click();assert.equal(timers.size,1);
 assert.equal(nodes['room-screen'].hidden,false);tick(2199);assert.ok(nodes['question-screen'].hidden);
 tick(1);assert.equal(nodes['question-screen'].hidden,false);assert.ok(nodes['question-title'].focused);
 tick(10000);assert.ok(nodes['answer-status'].hidden);assert.ok(answers.every(a=>a.attributes['aria-pressed']==='false'));
 answers[2].click();assert.equal(answers[2].attributes['aria-pressed'],'true');assert.equal(nodes['answer-status'].hidden,false);
 assert.ok(nodes['demo-status'].textContent.includes('Resposta C'));assert.ok(answers.every(a=>a.disabled));
 answers[3].click();assert.equal(answers[3].attributes['aria-pressed'],'false');
});

test('keyboard focus fills examples in either order and every answer can be selected',()=>{
 for(let selected=0;selected<4;selected++){
  const {nodes,answers,tick}=demo();
  nodes['team-name'].focus();assert.ok(nodes['join-button'].disabled);
  nodes['room-code'].focus();assert.equal(nodes['join-button'].disabled,false);
  nodes['join-button'].click();tick(2200);answers[selected].click();
  assert.equal(answers[selected].attributes['aria-pressed'],'true');
  assert.equal(answers.filter(a=>a.attributes['aria-pressed']==='true').length,1);
 }
});

test('restarting cancels the waiting question and clears the previous answer',()=>{
 const {nodes,answers,tick,timers}=demo();
 nodes['room-code'].click();nodes['team-name'].click();nodes['join-button'].click();
 nodes.replay.click();assert.equal(timers.size,0);tick(3000);
 assert.ok(nodes['question-screen'].hidden);assert.equal(nodes['room-code'].value,'');assert.ok(nodes['join-button'].disabled);
 nodes['room-code'].click();nodes['team-name'].click();nodes['join-button'].click();tick(2200);
 answers[0].click();nodes.replay.click();
 assert.ok(nodes['answer-status'].hidden);assert.ok(answers.every(a=>!a.disabled&&a.attributes['aria-pressed']==='false'));
});

test('standalone interactive route keeps keyboard-accessible example fields and hosting routes',()=>{
 const html=fs.readFileSync('dist/demo/join/index.html','utf8');
 assert.ok(html.includes('Demonstração interativa'));assert.ok(html.includes('readonly autocomplete="off"'));
 assert.equal((html.match(/data-answer="[A-D]"/g)||[]).length,4);
 assert.ok(html.includes('aria-live="polite"'));assert.ok(!html.includes('<form'));assert.ok(!html.includes('/api/'));
 for(const asset of ['/demo/join/join.css','/demo/join/join.js','/assets/eva-symbol.svg'])assert.ok(fs.existsSync('dist'+asset));
 const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
 for(const source of ['/demo/join','/demo/join/'])assert.equal(routes.find(r=>r.source===source)?.destination,'/demo/join/index.html');
});
