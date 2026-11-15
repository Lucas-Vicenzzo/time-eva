
/* =========================== LIVE CLASS (quiz ao vivo) =========================== */
// Protótipo: os colegas de turma são SIMULADOS. No produto, um servidor em tempo real
// (ex.: Firebase/Supabase) liga a tela do professor aos celulares pelo código da sala.
function buildQuestions(){
 const dry=metricFor('PREC','drydays');
 const ozoneDataset=datasetFor('OZONE'),hasBrazil=(ozoneDataset.validBrazilBoundingBoxPixels??ozoneDataset.brazilBoundingBoxPixels)>0;
 const winner=RKEYS.reduce((a,k)=>dry.regions[k].value>dry.regions[a].value?k:a,RKEYS[0]);
 const options=[winner,...RKEYS.filter(k=>k!==winner).slice(0,3)];
 const make=(q,o,ok,show,exp)=>({q,o,ok,w:Object.fromEntries(o.map(([k])=>[k,1/o.length])),show,rev:show,exp:()=>exp});
 return [
 make(tx('Qual célula de referência teve mais dias secos no período observado?','Which reference grid cell had the most dry days in the observed period?'),options.map(k=>[k,rname(k)]),winner,{v:'PREC',m:'drydays',r:winner,y:1},`<b>${rname(winner)}</b>: ${nf(dry.regions[winner].value,0)} ${tx('dias secos. É uma célula de grade, não uma média regional.','dry days. This is one grid cell, not a regional average.')}`),
 make(tx('Qual período está coberto pelo arquivo MERRA-2 enviado?','Which period does the supplied MERRA-2 file cover?'),[['a',datasetFor('PREC').period],['b','1981–2024'],['c',tx('Um ano inteiro','An entire year')],['d',tx('Hoje, em tempo real','Today, in real time')]],'a',{v:'PREC',m:'RX1Day',r:'brasil',y:1},tx('O arquivo contém índices mensais do período ','The file contains monthly indices for ')+datasetFor('PREC').period),
 make(tx('O que o AIRS mede nesta visualização?','What does AIRS measure in this view?'),[['a','NDVI'],['b',tx('Temperatura do ar na superfície','Surface air temperature')],['c',tx('Área de floresta','Forest area')],['d',tx('Aumento desde 1981','Warming since 1981')]],'b',{v:'T2M',r:'brasil',y:0},tx('A variável <b>TSurfAir</b> foi convertida de kelvin para °C, usando observações com qualidade 0 ou 1.','<b>TSurfAir</b> was converted from kelvin to °C, using observations with quality 0 or 1.')),
 make(tx('Há observações de ozônio no recorte aproximado do Brasil?','Are there ozone observations in the approximate Brazil bounding box?'),[['a',tx('Sim, há observações nesse recorte','Yes, there are observations in that area')],['b',tx('É uma média nacional','It is a national average')],['c',tx('Não há observações nesse recorte','No observations in that area')],['d',tx('A passagem cobre todo o planeta','The swath covers the entire planet')]],hasBrazil?'a':'c',{v:'OZONE',r:'brasil',y:2},tx('Período: ','Period: ')+ozoneDataset.period+'. '+(hasBrazil?tx('Há observações válidas no recorte aproximado do Brasil; isso não representa cobertura de todo o país.','There are valid observations in the approximate Brazil bounding box; this does not imply coverage of the whole country.'):tx('Esta passagem não contém observações válidas no recorte aproximado do Brasil.','This swath contains no valid observations in the approximate Brazil bounding box.'))),
 make(tx('Estes recortes permitem concluir uma tendência de décadas?','Can these snapshots establish a trend over decades?'),[['a',tx('Sim, qualquer mapa permite','Yes, any map can')],['b',tx('Sim, porque são da NASA','Yes, because they are NASA data')],['c',tx('Não: precisamos de uma série histórica','No: we need a historical time series')],['d',tx('Sim, usando a maior medição','Yes, using the maximum value')]],'c',{v:'PREC',m:'RX1Day',r:'brasil',y:1},tx('Um mês e passagens individuais permitem estudar <b>condições observadas</b>. Uma tendência requer medições comparáveis ao longo do tempo.','One month and individual overpasses describe <b>observed conditions</b>. A trend requires comparable observations over time.')),
 ];
}
let QS=buildQuestions();
const TEAMS=['Macaw','Jaguar','Toucan','Capybara','Ipê','Otter','Tapir','Sloth','Anaconda','Puma','Heron','Armadillo'];
const QT=20; // segundos por pergunta (demo)
const CL={phase:'lobby',qi:0,code:'K7Q24',teams:[],ans:QS.map(()=>({})),t0:0,timers:[],tick:null,me:{joined:false,name:''}};
const L='ABCD';
function clT(ms,fn){ CL.timers.push(setTimeout(fn,ms)); }
function simJoin(){ if(CL.teams.some(t=>t.sim)) return; TEAMS.forEach((n,i)=>clT(700+i*550+Math.random()*400,()=>{ CL.teams.push({name:n,sim:true,pts:0,ok:0}); clRefresh(); })); }
function pick(w){ let r=Math.random(),s=0; for(const[k,v] of Object.entries(w)){ s+=v; if(r<=s) return k; } return Object.keys(w)[0]; }
function startQ(i){ CL.qi=i; CL.phase='q'; CL.t0=Date.now(); const Q=QS[i];
  showQuizData(Q.show);
  CL.teams.filter(t=>t.sim).forEach(t=>clT(1500+Math.random()*(QT-4)*1000,()=>{ if(CL.phase!=='q'||CL.qi!==i) return; answer(t.name,pick(Q.w)); }));
  clearInterval(CL.tick); CL.tick=setInterval(()=>{ const left=QT-(Date.now()-CL.t0)/1000; if(left<=0){ reveal(); return; } tickUI(left); },250);
  render(); }
function answer(name,k){ const a=CL.ans[CL.qi]; if(a[name]) return; const t=(Date.now()-CL.t0)/1000; a[name]={k,t}; clRefresh(); if(Object.keys(a).length>=CL.teams.length) clT(600,reveal); }
function reveal(){ if(CL.phase!=='q') return; clearInterval(CL.tick); CL.phase='reveal'; const Q=QS[CL.qi];
  Object.entries(CL.ans[CL.qi]).forEach(([n,a])=>{ const tm=CL.teams.find(t=>t.name===n); if(tm&&a.k===Q.ok){ a.pts=Math.round(1000*(1-.5*a.t/QT)); tm.pts+=a.pts; tm.ok++; } else a.pts=0; });
  showQuizData(Q.rev); render();
  evaSay(Q.exp(),{peek:true});setEvaMood(Object.values(CL.ans[CL.qi]).some(a=>a.k===Q.ok)?'bouncy':'thoughtful',{resetAfter:2200}); }
function nextStep(){ if(CL.phase==='reveal') { CL.phase=CL.qi===QS.length-1?'final':'board'; if(CL.phase==='final') { showQuizData({v:'PREC',m:'RX1Day',r:'brasil'}); } render(); }
  else if(CL.phase==='board') startQ(CL.qi+1); }
function resetClass(){ CL.timers.forEach(clearTimeout); clearInterval(CL.tick); Object.assign(CL,{phase:'lobby',qi:0,teams:CL.me.joined?[{name:CL.me.name,sim:false,pts:0,ok:0}]:[],ans:QS.map(()=>({})),timers:[]}); }
let clRT=null; function clRefresh(){ if(VIEW!=='class') return; clearTimeout(clRT); clRT=setTimeout(()=>{ if(CL.phase==='q'){ liveUI(); renderPhone(); } else render(); },80); }
const ranked=()=>[...CL.teams].sort((a,b)=>b.pts-a.pts);
const myTeam=()=>CL.teams.find(t=>!t.sim);

function viewClass(){
  if(ROLE==='student') return `<div class="col"><div class="lbl">Student view</div><div id="psBig" class="card" style="padding:0;min-height:520px;display:flex;flex-direction:column"></div></div><div id="slotGlobe" style="position:relative;min-height:0"></div>`;
  const steps=`<div class="steps"><span class="${CL.phase==='lobby'?'on':'ok'}">Lobby</span>${QS.map((_,i)=>`<span class="${(CL.phase==='q'||CL.phase==='reveal'||CL.phase==='board')&&CL.qi===i?'on':(CL.phase==='final'||i<CL.qi)?'ok':''}">Q${i+1}</span>`).join('')}<span class="${CL.phase==='final'?'on':''}">Results</span></div>`;
  let b='';
  if(CL.phase==='lobby') b=`<div><span class="lbl">Demo · Earthdata Detective · ${QS.length} questions · simulated teams</span><div class="qtext" style="margin-top:10px">Find the evidence.<br>Fastest correct answer wins.</div></div>
    <div class="codebox"><div><div class="lbl">Join at</div><div class="u">${tx("Simulação local","Local simulation")}</div><div class="lbl" style="margin-top:10px">Teams joined · <b style="color:var(--tx)" id="nTeams">${CL.teams.length}</b></div></div><div class="c">${CL.code}</div></div>
    <div class="teams" id="teams">${CL.teams.map(t=>`<div class="team ${t.sim?'':'me'}"><span>Team ${esc(t.name)}</span><span class="lbl">ready</span></div>`).join('')||'<span class="lbl">Waiting for teams…</span>'}</div>
    <div class="row"><button class="btn solid" id="cStart">Start quiz →</button><button class="btn ghost" data-go="monitor">Back to monitor</button></div>`;
  if(CL.phase==='q'||CL.phase==='reveal'){ const Q=QS[CL.qi], a=CL.ans[CL.qi], n=Object.keys(a).length, rev=CL.phase==='reveal';
    const cnt=k=>Object.values(a).filter(x=>x.k===k).length;
    b=`<div class="qhead"><span class="lbl">Question ${CL.qi+1} / ${QS.length}</span><span class="lbl" id="tLeft">${rev?'Time\'s up':QT+'s'}</span></div><div class="tbar"><i id="tBar" style="width:${rev?0:100}%"></i></div>
      <div class="qtext">${Q.q}</div>
      <div class="opts">${Q.o.map(([k,t],i)=>`<div class="opt ${rev?(k===Q.ok?'right':'dim'):''}"><span class="k">${L[i]}</span><span class="t">${t}</span>${rev?`<span class="n">${cnt(k)}</span><div class="bar" style="width:${n?cnt(k)/n*100:0}%"></div>`:''}</div>`).join('')}</div>
      <div class="stats"><div><div class="lbl">Answers</div><div class="v" id="nAns">${n} / ${CL.teams.length}</div></div><div><div class="lbl">Correct</div><div class="v">${rev?Math.round(cnt(Q.ok)/(n||1)*100)+'%':'—'}</div></div><div><div class="lbl">Globe</div><div class="v" style="font-size:15px;margin-top:9px">${REG[region].short} · ${VARS[VAR].short}</div></div></div>
      ${rev?`<div class="explain"><svg viewBox="0 0 120 140"><use href="#botSym"/></svg><p><span class="lbl" style="color:var(--y);display:block;margin-bottom:4px">EVA explains</span>${Q.exp()}</p></div>
        <div class="row"><button class="btn solid" id="cNext">${CL.qi===QS.length-1?'See final results →':'Leaderboard →'}</button><button class="btn ghost" id="cAsk">Ask EVA more</button></div>`
       :`<div class="row"><button class="btn ghost" id="cHint">EVA hint</button><button class="btn solid" id="cReveal">Reveal answer</button></div>`}`; }
  if(CL.phase==='board') b=`<div><span class="lbl">Leaderboard · after question ${CL.qi+1}</span><div class="qtext" style="margin-top:8px">Who's leading?</div></div>
    <div class="lb">${ranked().slice(0,7).map((t,i)=>`<div class="${t.sim?'':'me'}"><span class="pos">${String(i+1).padStart(2,'0')}</span><span>Team ${esc(t.name)}</span><span class="ok">${t.ok}/${CL.qi+1}</span><span class="pts">${t.pts}</span></div>`).join('')}</div>
    <div class="row"><button class="btn solid" id="cNext">Next question →</button></div>`;
  if(CL.phase==='final'){ const R=ranked(); const acc=QS.map((Q,i)=>{const a=Object.values(CL.ans[i]); return a.length?a.filter(x=>x.k===Q.ok).length/a.length:0;}); const worst=acc.indexOf(Math.min(...acc));
    b=`<div><span class="lbl">Final results</span><div class="qtext" style="margin-top:8px">Team ${esc(R[0]?.name||'—')} wins 🏆</div></div>
      <div class="lb">${R.slice(0,3).map((t,i)=>`<div class="${t.sim?'':'me'}"><span class="pos">${['1st','2nd','3rd'][i]}</span><span>Team ${esc(t.name)}</span><span class="ok">${t.ok}/${QS.length}</span><span class="pts">${t.pts}</span></div>`).join('')}</div>
      <div><div class="lbl" style="margin-bottom:4px">Class report · correct answers per question</div><div class="qrep">${QS.map((Q,i)=>`<div><span class="lbl">Q${i+1}</span><span>${Q.q}</span><div class="track"><i style="width:${acc[i]*100}%;background:${acc[i]>=.7?'var(--g)':acc[i]>=.5?'var(--y)':'var(--r)'}"></i></div><span class="mono" style="text-align:right">${Math.round(acc[i]*100)}%</span></div>`).join('')}</div></div>
      <div class="note"><b>Review next class:</b> Q${worst+1}, only ${Math.round(acc[worst]*100)}% got it right. ${QS[worst].exp()}</div>
      <div class="row"><button class="btn solid" id="cAgain">Run again</button><button class="btn ghost" data-go="monitor">Back to monitor</button></div>`; }
  return `<div class="col">${steps}${b}</div><div id="slotGlobe" style="position:relative;min-height:0"></div>`;
}
function classAfter(){
  if(CL.phase==='lobby') simJoin();
  // como aluno, o professor é simulado: o quiz avança sozinho
  if(ROLE==='student'&&CL.me.joined&&!CL.auto){ CL.auto=1; clearTimeout(CL.autoT);
    const nextT=CL.phase==='lobby'?4000:CL.phase==='reveal'?6500:CL.phase==='board'?4000:0;
    if(nextT) CL.autoT=setTimeout(()=>{ CL.auto=0; if(CL.phase==='lobby') startQ(0); else if(CL.phase!=='q') nextStep(); },nextT); else CL.auto=0; }
  const on=(id,f)=>{ const e=$(id); if(e) e.onclick=f; };
  on('cStart',()=>startQ(0)); on('cReveal',reveal); on('cNext',nextStep); on('cAgain',()=>{ resetClass(); render(); });
  on('cHint',()=>evaSay(hintFor(CL.qi),{peek:true})); on('cAsk',()=>{ openEva(true); ask(`Explain the answer to: "${QS[CL.qi].q}"`); });
  if(CL.phase==='q'){ tickUI(QT-(Date.now()-CL.t0)/1000); }
  renderPhone();
}
function hintFor(i){return [tx('Compare os valores das células de referência no MERRA-2.','Compare the MERRA-2 reference grid cells.'),tx('Confira o período na fonte.','Check the period in the source.'),tx('Leia o nome da variável no painel AIRS.','Read the variable name in the AIRS panel.'),tx('Uma passagem não cobre todos os países.','A swath does not cover every country.'),tx('Compare o número de períodos disponíveis.','Consider how many periods are available.')][i];}
function tickUI(left){ const tb=$('tBar'), tl=$('tLeft'); if(tb) tb.style.width=Math.max(0,left/QT*100)+'%'; if(tl) tl.textContent=Math.ceil(Math.max(0,left))+'s'; }
function liveUI(){ const a=CL.ans[CL.qi], n=Object.keys(a).length, e=$('nAns'); if(e) e.textContent=`${n} / ${CL.teams.length}`; }

/* ---------- student phone ---------- */
function phoneHTML(){ const me=CL.me, Q=QS[CL.qi], a=CL.ans[CL.qi]?.[me.name];
  const top=`<div class="ph-top"><span>EVA Classroom</span>${me.joined?`<b>Team ${esc(me.name)}</b>`:'<span>Join</span>'}</div>`;
  if(!me.joined) return top+`<div class="ph"><svg viewBox="0 0 120 140" style="width:52px;height:60px;margin:0 auto"><use href="#botSym"/></svg><h4>Join a live class</h4>
    <input class="code" id="phCode" value="${CL.code}" maxlength="5" placeholder="CODE"><input id="phName" maxlength="14" placeholder="Team name"><div class="err" id="phErr"></div><button class="go" id="phJoin">Join</button><small>No account, no email. Just a team name.</small></div>`;
  if(CL.phase==='lobby') return top+`<div class="ph"><div class="bigi">✓</div><h4>You're in!</h4><p>Look at the main screen. The quiz starts soon.</p><div class="wait"><i></i><i></i><i></i></div></div>`;
  if(CL.phase==='q'&&!a) return top+`<div class="ph q"><span class="lbl">Question ${CL.qi+1} / ${QS.length}</span><h4>${Q.q}</h4><div class="ans">${Q.o.map(([k,t],i)=>`<button data-k="${k}"><span>${L[i]}</span>${t}</button>`).join('')}</div></div>`;
  if(CL.phase==='q') return top+`<div class="ph"><div class="bigi">🔒</div><h4>Answer locked</h4><p>${L[Q.o.findIndex(o=>o[0]===a.k)]} · ${Q.o.find(o=>o[0]===a.k)[1]}</p><div class="wait"><i></i><i></i><i></i></div></div>`;
  const rank=ranked().findIndex(t=>!t.sim)+1, mt=myTeam();
  if(CL.phase==='reveal'){ const ok=a&&a.k===Q.ok; return top+`<div class="ph"><div class="res ${ok?'ok':'no'}"><b>${ok?'Correct':a?'Not this time':'No answer'}</b>${ok?`+${a.pts} pts`:'+0 pts'}</div><p>${Q.exp().replace(/<[^>]+>/g,'')}</p><small>Rank #${rank} · ${mt.pts} pts</small></div>`; }
  if(CL.phase==='board') return top+`<div class="ph"><div class="bigi mono">#${rank}</div><h4>${rank<=3?'On the podium!':'Keep going!'}</h4><p>${mt.pts} points · ${mt.ok}/${CL.qi+1} correct</p><div class="wait"><i></i><i></i><i></i></div></div>`;
  return top+`<div class="ph"><div class="bigi">${rank===1?'🏆':'🏅'}</div><h4>You finished #${rank}</h4><p>${mt.pts} points · ${mt.ok}/${QS.length} correct</p><small>Explore the data on the Monitor to beat your score next time.</small></div>`; }
function renderPhone(){ const me=CL.me, a=CL.ans[CL.qi]?.[me.name], mt=myTeam();
  const key=[me.joined,CL.phase,CL.qi,a?a.k:'',mt?mt.pts:'',CL.phase==='board'||CL.phase==='final'?ranked().findIndex(t=>!t.sim):''].join('|');
  ['ps','psBig'].forEach(id=>{ const P=$(id); if(!P) return; if(P.dataset.key===key&&P.innerHTML) return; P.dataset.key=key; P.innerHTML=phoneHTML(); bindPhone(P); }); }
function bindPhone(P){ const me=CL.me, g=s=>P.querySelector(s);
  if(g('#phJoin')) g('#phJoin').onclick=()=>{ const n=g('#phName').value.trim(); if(!n){ g('#phErr').textContent='Pick a team name'; return; } if(g('#phCode').value.trim().toUpperCase()!==CL.code){ g('#phErr').textContent='Invalid code'; return; }
    me.joined=true; me.name=n; CL.teams.push({name:n,sim:false,pts:0,ok:0}); clRefresh(); renderPhone(); };
  if(g('#phName')) g('#phName').oninput=()=>g('#phErr').textContent='';
  P.querySelectorAll('.ans button').forEach(b=>b.onclick=()=>{ answer(me.name,b.dataset.k); renderPhone(); }); }
