
/* =========================== EVA =========================== */
const msgsEl=$('msgs'); let muteNarr=false, lastKey={}, soundOn=false, voice=null, sampleApi=null, ttsApi=null, busy=false; const hist=[];
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const plainMath=s=>s.replace(/\$([^$]*)\$/g,(_,math)=>math.replace(/\\text\{([^}]+)\}/g,'$1').replace(/\^?\\circ/g,'°').replace(/[{}]/g,''));
const md=s=>esc(plainMath(s)).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
const plainOf=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent;};
const evaOpen=()=>document.body.classList.contains('eva-open');
function openEva(o){ document.body.classList.toggle('eva-open',o); $('peek').classList.remove('show'); if(o) setTimeout(()=>{msgsEl.scrollTop=msgsEl.scrollHeight;$('q').focus();},60); else stopVoice(); }
$('evaBtn').onclick=()=>openEva(!evaOpen()); $('evaX').onclick=()=>openEva(false);
function addMsg(role,html,key){ if(key&&lastKey[key]&&lastKey[key]===msgsEl.lastElementChild){ lastKey[key].innerHTML=html; return lastKey[key]; }
  const m=document.createElement('div'); m.className='m '+role; m.innerHTML=html; msgsEl.appendChild(m); if(key) lastKey[key]=m; msgsEl.scrollTop=msgsEl.scrollHeight; return m; }
let peekT=null;
function evaSay(html,{peek=true,speak=true,key=null}={}){ if(muteNarr) return; addMsg('eva',html,key);
  if(peek&&!evaOpen()){ const p=$('peek'); p.innerHTML=`<span class="lbl">EVA</span>${html}`; p.classList.add('show'); clearTimeout(peekT); peekT=setTimeout(()=>p.classList.remove('show'),9000); }
  if(speak) speakText(plainOf(html)); }
$('peek').onclick=()=>openEva(true);
/* voz (desligada por padrão) */
function pickVoice(){const v=speechSynthesis?.getVoices?.()||[];voice=v.find(x=>x.lang.startsWith(LANG==='pt'?'pt':'en'))||null;}
if('speechSynthesis' in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}
function speakText(s){ if(!soundOn) return; s=s.replace(/°C/g,' degrees').replace(/−/g,'minus ').slice(0,1900);
  if(ttsApi){ ttsApi.speak(s,{language:'en',voice:'airy'}).catch(e=>{ if(e?.code==='not_granted') ttsApi=null; }); return; }
  if('speechSynthesis' in window){ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(s); u.lang=LANG==='pt'?'pt-BR':'en-US'; if(voice) u.voice=voice; speechSynthesis.speak(u); } }
function stopVoice(){ try{ttsApi?.stop();}catch(e){} try{speechSynthesis?.cancel();}catch(e){} }
$('snd').onclick=()=>{ soundOn=!soundOn; $('snd').textContent=soundOn?'🔊':'🔇'; if(!soundOn) stopVoice(); };

let aiAvailable=null,aiState='checking';
function setStat(state){
 aiState=typeof state==='boolean'?(state?'configured':'unavailable'):state;aiAvailable=['configured','answering','online'].includes(aiState);
 $('estat').textContent=({checking:tx('● Verificando Gemini…','● Checking Gemini…'),configured:tx('● Gemini configurado','● Gemini configured'),answering:tx('● Gemini respondendo…','● Gemini responding…'),online:tx('● Gemini ativo','● Gemini active'),limited:tx('● Limite do Gemini atingido','● Gemini quota reached'),unavailable:tx('● Gemini indisponível','● Gemini unavailable')})[aiState];$('estat').classList.toggle('off',['limited','unavailable'].includes(aiState));
}
function localSummary(q){
 if(VIEW==='class'&&CL.phase==='q')return hintFor(CL.qi);
 if(/caus|ocasion|por qu[eê]|porque|possibil|explain why|what.*lead/i.test(q))return (dataMode==='history'?historyInsight().replace(/<[^>]+>/g,'')+' ':'')+(VAR==='PREC'?tx('Possibilidades a investigar incluem mudanças na circulação atmosférica, variações dos oceanos e mudanças no uso do solo. Essas hipóteses não estão comprovadas para este local. A turma pode comparar registros de chuva e mapas de vegetação de diferentes anos.','Possible explanations to investigate include atmospheric circulation, ocean variability and land-use changes. These hypotheses are not established for this location. Compare rainfall records and land-cover maps from different years.'):VAR==='T2M'?tx('Possibilidades a investigar incluem o aquecimento global por gases de efeito estufa, perda de vegetação ou urbanização local e variações naturais. Os dados aqui não identificam uma causa local. A turma pode comparar a temperatura de áreas sombreadas e asfaltadas para investigar aquecimento local; isso não comprova a causa da tendência histórica.','Possible explanations include global greenhouse warming, local vegetation loss or urbanization, and natural variability. These data do not identify a local cause. Compare shaded and paved areas to investigate local heating; this does not establish the cause of the historical trend.'):tx('O ozônio varia com processos da estratosfera e circulação atmosférica. Este recorte não permite atribuir uma causa local nem medir poluição por ozônio na superfície.','Ozone varies with stratospheric processes and atmospheric circulation. This snapshot cannot establish a local cause or measure surface ozone pollution.'));
 if(/veget|ndvi|evi/i.test(q))return tx('Não temos um índice de vegetação neste conjunto. A perda de vegetação pode ser discutida como hipótese, mas precisa de mapas de cobertura do solo para ser investigada.','This dataset has no vegetation index. Vegetation loss is a possible hypothesis, but needs land-cover maps to investigate.');
 if(dataMode==='history')return historyInsight().replace(/<[^>]+>/g,'');
 if(/tend[eê]ncia|trend|signific|1981|veget|ndvi|evi/i.test(q))return tx('Os arquivos enviados são recortes de 2026. Eles não permitem calcular tendências históricas nem índices de vegetação (NDVI/EVI). Para isso precisamos de uma série temporal e do produto adequado.','The supplied files are 2026 snapshots. They cannot establish historical trends or vegetation indices (NDVI/EVI). We need a time series and the appropriate product.');
 return insightHTML().replace(/<[^>]+>/g,'')+' '+tx('Fonte: ','Source: ')+activeDataset().name;
}
async function ask(q){
 q=(q||'').trim();if(!q||busy)return;applyExplorationIntent(q);addMsg('me',esc(q));stopVoice();
 // An active question receives a deterministic hint rather than sending its answer to the AI.
 if(VIEW==='class'&&CL.phase==='q'){evaSay(localSummary(q),{peek:false});return;}
 busy=true;let answered=false;setStat('answering');setEvaMood('thoughtful');$('send').disabled=true;const m=addMsg('eva','<span class="dots"><i></i><i></i><i></i></span>');
 const d=activeDataset(),metric=activeMetric(),key=dataMode==='history'?historyParameter():VAR==='PREC'?merraMetric:VAR==='T2M'?'TSurfAir':'ozone';
 const pointIndex=selectedObservation?metric.points.findIndex(p=>p[0]===selectedObservation.lon&&p[1]===selectedObservation.lat&&p[2]===selectedObservation.value):undefined;
 try{
  const res=await fetch('/api/eva',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({question:q,dataset:d.id,metric:key,language:LANG,history:hist.slice(-6).map(h=>({role:h.role,text:h.content.slice(0,2000)})),referenceRegion:dataMode==='files'&&VAR==='PREC'&&region!=='brasil'?region:undefined,pointIndex:dataMode==='files'&&pointIndex>=0?pointIndex:undefined,latitude:dataMode==='history'?historySite.latitude:undefined,longitude:dataMode==='history'?historySite.longitude:undefined,selectedYear:dataMode==='history'?year:undefined})});
  const result=await res.json();
  if(!res.ok){setStat(res.status===429?'limited':'unavailable');const reason=result.error==='nasa_unavailable'?tx('A consulta à NASA falhou.','The NASA lookup failed.'):res.status===429?tx('O limite de uso do Gemini foi atingido.','Gemini’s usage quota was reached.'):tx('Não consegui uma resposta do Gemini agora.','I could not get a Gemini response right now.');m.innerHTML='<small class="response-origin">'+tx('Resposta local · sem Gemini','Local response · no Gemini')+'</small>'+esc(reason)+'<br><br>'+esc(localSummary(q));return;}
  if(typeof result.text!=='string'||!result.text.trim())throw new Error('empty_response');
  answered=true;setStat('online');m.innerHTML='<small class="response-origin">Gemini</small>'+md(result.text);hist.push({role:'user',content:q},{role:'assistant',content:result.text});speakText(result.text);
 }catch{setStat('unavailable');m.innerHTML='<small class="response-origin">'+tx('Resposta local · sem Gemini','Local response · no Gemini')+'</small>'+esc(tx('Não foi possível consultar o Gemini. ','Could not reach Gemini. '))+esc(localSummary(q));}

 finally{setEvaMood(answered?'happy':'curious',{resetAfter:2500});busy=false;$('send').disabled=false;msgsEl.scrollTop=msgsEl.scrollHeight;}
}
function refreshChips(){
 $('chips').innerHTML='';[tx('O que pode explicar essa mudança?','What could explain this change?'),tx('Como isso afeta o ambiente?','How does this affect the environment?'),tx('O que podemos investigar na escola?','What can we investigate at school?')].forEach(q=>{const b=document.createElement('button');b.textContent=q;b.onclick=()=>ask(q);$('chips').appendChild(b);});
 $('q').placeholder=tx('Pergunte à EVA sobre os dados…','Ask EVA about the observations…');setStat(aiState);
}
$('askf').onsubmit=e=>{e.preventDefault();const v=$('q').value;$('q').value='';ask(v);};
(async()=>{try{const r=await fetch('/api/eva');if(r.ok)setStat(Boolean((await r.json()).ai));}catch{setStat(false);}})();
