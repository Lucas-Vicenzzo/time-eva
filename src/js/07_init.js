function refreshChrome(){
 const labels={monitor:tx('Monitor climático','Climate monitor'),class:tx('Aula ao vivo','Live class')};
 document.querySelectorAll('.nav[data-v]').forEach(b=>{for(const n of b.childNodes)if(n.nodeType===3)n.textContent=labels[b.dataset.v];});
 document.querySelector('#side .sec').textContent=tx('Menu principal','Main menu');
 document.querySelectorAll('.role button').forEach(b=>b.textContent=b.dataset.r==='teacher'?tx('Professor','Teacher'):tx('Aluno','Student'));
 document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===LANG));
 document.documentElement.lang=LANG==='pt'?'pt-BR':'en';
 configureTimeline();
 document.querySelector('#intro p').textContent=tx('Explore temperatura, extremos de chuva e ozônio nos arquivos enviados. Compare locais e investigue a evidência com a EVA.','Explore temperature, rainfall extremes and ozone in the supplied files. Compare locations and investigate the evidence with EVA.');
 refreshChips();
}
refreshChrome();render();setFromLatLon(camera.position,15,20,HOME_D);requestAnimationFrame(loop);
addMsg('eva',tx('Olá! Sou a <strong>EVA</strong>. Investigue os dados reais de MERRA-2, AIRS e Sentinel-5P. Use a timeline para acompanhar as mudanças ao longo dos anos. Nos arquivos do desafio, confira também as datas e a cobertura.','Hi! I’m <strong>EVA</strong>. Investigate real MERRA-2, AIRS and Sentinel-5P data. Use the timeline to follow changes over the years. For challenge files, also check their dates and coverage.'));
 document.querySelectorAll('#intro [data-role]').forEach(b=>b.onclick=()=>{$('intro').classList.add('gone');setRole(b.dataset.role);evaSay(insightHTML());setEvaMood('excited',{resetAfter:2400});});
 document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{if(busy)return;LANG=b.dataset.lang;try{localStorage.setItem('eva-language',LANG);}catch{}hist.length=0;QS=buildQuestions();resetClass();refreshChrome();render();setEvaMood('happy',{resetAfter:1800});});
// The landing CTA already expresses the intent to explore; enter the demo directly.
if(location.pathname.startsWith('/demo')){$('intro').classList.add('gone');$('intro').style.display='none';if(new URLSearchParams(location.search).get('role')==='student')setRole('student');}
window.__ready=true;window.__EVADENCE_OK=true;window.evaDemoReady?.();
