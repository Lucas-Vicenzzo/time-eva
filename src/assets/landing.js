/* Adapted from Lucas-Vicenzzo/time-eva, main at 6fa97cc. Demo and landing stay isolated. */
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const nav=document.getElementById('nav');
addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>40),{passive:true});
if(!reduced.matches&&'IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');observer.unobserve(entry.target);}}),{threshold:.08});
 document.querySelectorAll('.reveal').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('reveal-pending');observer.observe(el);}});
}
const extra={
 'Materiais e referências compartilhados pela equipe estão reunidos no Drive do projeto.':'Materials and references shared by the team are gathered in the project Drive.',
 'Escolha o que investigar':'Choose what to investigate',
 'Escolha um lugar, observe as mudanças e transforme os dados em uma conversa sobre o planeta.':'Choose a location, observe the changes and turn data into a conversation about our planet.',
 'Temperatura e chuva ao longo dos anos. Nos arquivos do desafio, explore também extremos e ozônio.':'Temperature and rainfall through the years. Explore extremes and ozone in the challenge files too.',
 'Viaje pela timeline':'Travel through the timeline',
 'Use a timeline e o gráfico para comparar médias anuais e observar a tendência linear do ponto selecionado.':'Use the timeline and chart to compare annual means and observe the selected point’s linear trend.',
 'Médias anuais':'Annual means',
 'A EVA usa os valores do conjunto selecionado para explicar possibilidades e propor investigações na escola.':'EVA uses values from the selected dataset to explain possibilities and suggest school investigations.',
 'Explore no seu ritmo ou':'Explore at your own pace or',
 'com a turma':'with the class',
 'O estudante explora locais e anos no próprio ritmo, compara os gráficos e leva suas perguntas para a EVA.':'Students explore locations and years at their own pace, compare charts and ask EVA their questions.',
 'O professor projeta o globo e conduz a discussão. O quiz disponível nesta demo é uma simulação local, sem conexão entre dispositivos.':'Teachers project the globe and lead the discussion. The demo quiz is a local simulation, without a connection between devices.',
 'Atividades para discutir dados e formular hipóteses':'Activities to discuss data and develop hypotheses',
 'Uma proposta para explorar em projetos e atividades da escola':'A proposal for school projects and activities',
 'Uma ideia construída':'An idea developed',
 'com a escola':'with schools',
 '© 2026 EVA Classroom · Protótipo educacional':'© 2026 EVA Classroom · Educational prototype',
 'Dados fornecidos pela NASA. O EVA Classroom não é afiliado nem endossado pela NASA.':'Data provided by NASA. EVA Classroom is not affiliated with or endorsed by NASA.'
};
const translations=Object.fromEntries(Object.entries(typeof EN==='undefined'?{}:EN).map(([k,v])=>[k.replaceAll('E.V.A','EVA Classroom'),v.replaceAll('E.V.A','EVA Classroom')]));
Object.assign(translations,extra);
const originals=new Map(),norm=s=>s.replace(/\s+/g,' ').trim();
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest('script,style,#globe,.lang,[data-en]')?NodeFilter.FILTER_REJECT:node.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
let node;while(node=walker.nextNode())originals.set(node,node.nodeValue);
function applyLanguage(lang){
 for(const [node,text] of originals){const translated=translations[norm(text)];node.nodeValue=lang==='en'&&translated?text.match(/^\s*/)[0]+translated+text.match(/\s*$/)[0]:text;}
 document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[lang]);
 document.querySelector('meta[name=description]').content=lang==='en'?'Explore real NASA data in an interactive globe. Investigate temperature and rainfall through the years and discuss possible explanations with EVA.':'Explore dados reais da NASA em um globo interativo. Investigue temperatura e chuva ao longo do tempo e converse com a EVA sobre as possibilidades por trás das mudanças.';
 document.documentElement.lang=lang==='en'?'en':'pt-BR';document.title=lang==='en'?'EVA Classroom · Ask the planet':'EVA Classroom · Pergunte ao planeta';
 document.querySelectorAll('[data-l]').forEach(b=>{b.classList.toggle('on',b.dataset.l===lang);b.setAttribute('aria-pressed',String(b.dataset.l===lang));});
 try{localStorage.setItem('eva-language',lang);}catch{}
}
let language='en';try{language=localStorage.getItem('eva-language')==='pt'?'pt':'en';}catch{}
document.querySelectorAll('[data-l]').forEach(button=>button.onclick=()=>applyLanguage(button.dataset.l));applyLanguage(language);
// Geographic preview only; the real annual data and interactive layers load in /demo/.
(()=>{
 const el=document.getElementById('globe');if(!window.Globe)return;
 try{
  const g=Globe()(el).backgroundColor('rgba(0,0,0,0)').globeImageUrl('/assets/nasa-blue-marble.jpg').showAtmosphere(true).atmosphereColor('#80c6ec').atmosphereAltitude(.12);
  const size=()=>{const w=el.clientWidth;g.width(w).height(w);};size();new ResizeObserver(size).observe(el);
  g.pointOfView({lat:12,lng:15,altitude:2.1},0);const controls=g.controls();controls.autoRotate=!reduced.matches;controls.autoRotateSpeed=.38;controls.enableZoom=false;controls.enablePan=false;
  if(matchMedia('(pointer:coarse)').matches)el.style.pointerEvents='none';
  let timer;el.addEventListener('pointerdown',()=>{controls.autoRotate=false;clearTimeout(timer);});el.addEventListener('pointerup',()=>{if(!reduced.matches)timer=setTimeout(()=>controls.autoRotate=!document.hidden,2500);});
  document.addEventListener('visibilitychange',()=>controls.autoRotate=!document.hidden&&!reduced.matches);reduced.addEventListener('change',()=>controls.autoRotate=!document.hidden&&!reduced.matches);
 }catch{el.replaceChildren();}
})();
