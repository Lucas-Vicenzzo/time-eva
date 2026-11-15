const $ = id => document.getElementById(id);
const copy = {
 pt: {
  tagline:'Ciência da Terra para a sala de aula', language:'Idioma',title:'Explore o planeta. Encontre a evidência.',
  subtitle:'Investigue observações reais dos arquivos do desafio. Compare lugares, entenda as medições e converse com a EVA.',
  verified:'3 conjuntos · arquivos verificados',source:'Ver fonte ↗',mapHint:'Toque ou clique no mapa para consultar um ponto.',
  evaTitle:'Investigue com a EVA',questionLabel:'Sua pergunta para a EVA',send:'Enviar',privacy:'Envie apenas perguntas sobre os dados. Evite informações pessoais.',
  detailTitle:'Uma observação, diferentes lugares',detailIntro:'MERRA-2: uma célula de grade próxima a cada ponto de referência. Os valores não são médias de regiões ou biomas.',
  limitsTitle:'O que podemos concluir?',trendLimit:'Estes recortes não permitem calcular tendências de décadas. Vegetação (NDVI/EVI) não está presente nestes produtos.',
  download:'Baixar dados e rastreabilidade',footer:'Demo educativa · observações de 2026 · sem dados simulados nesta tela',
  merra2:'Extremos de chuva e calor',airs:'Temperatura observada',sentinel5p:'Ozônio na atmosfera',
  min:'Mínimo válido',max:'Máximo válido',mean:'Média das medições',days:'dias',grid:'Estatísticas de todas as células válidas, sem ponderação por área. O mapa exibe uma amostra a cada 8 células; sem interpolação.',
  swath:'Estatísticas dos pontos aprovados pelo filtro de qualidade. O mapa mostra apenas a faixa observada; áreas sem pontos não têm medições neste recorte.',
  merraNote:'Setembro de 2026, grade global. Compare condições entre lugares. Valores ausentes de ondas de calor não equivalem a zero.',
  airsNote:'Uma passagem de 1º de janeiro de 2026 sobre parte da América do Sul e do Pacífico. Temperatura do ar na superfície, com qualidade 0 ou 1; conversão de kelvin para °C. Não é um produto de vegetação.',
  sentinelNote:'Uma passagem de 9 de novembro de 2026. Produto ESA/Copernicus, obtido via Earthdata. A faixa enviada não cobre o Brasil. Filtro qa_value ≥ 0,5; conversão de mol/m² para unidades Dobson (DU).',
  local:'EVA local · Gemini não configurado',online:'Gemini · disponível',checking:'Verificando conexão…',greeting:'Olá! Sou a EVA. Selecione uma fonte e uma variável. Posso explicar o que foi medido, comparar valores e mostrar os limites da evidência.',
  placeholder:'O que esses dados mostram?',suggestions:['Explique a variável selecionada.','Podemos concluir uma tendência?','Qual é a cobertura destes dados?'],
  waiting:'Consultando a EVA…',quota:'A cota do Gemini foi atingida. Tente novamente em alguns instantes. ',unavailable:'O Gemini está indisponível neste momento. ',fallback:'Resumo local dos dados: ',
  trendAnswer:'Não podemos concluir uma tendência histórica com estes arquivos: o MERRA-2 cobre um mês e AIRS/Sentinel-5P são passagens únicas. Precisamos de medições comparáveis ao longo de vários anos.',
  noPoint:'Selecione um ponto colorido para ver a medição e as coordenadas.',selected:'Ponto selecionado',missing:'Sem valor válido',lat:'latitude',lon:'longitude',
  nearest:'Célula próxima de',single:'Um recorte de satélite',singleDetail:'A faixa mostra onde o satélite observou. A temperatura AIRS é do ar na superfície; o ozônio Sentinel-5P representa a coluna atmosférica total.',
  samples:'pontos no mapa',localLabel:'Resposta local',sourceLabel:'Fonte',reset:'Contexto atualizado. Faça uma pergunta sobre a nova seleção.',
 },
 en: {
  tagline:'Earth science for the classroom',language:'Language',title:'Explore the planet. Find the evidence.',
  subtitle:'Investigate real observations from the challenge files. Compare places, understand the measurements and talk to EVA.',
  verified:'3 datasets · verified files',source:'View source ↗',mapHint:'Tap or click the map to inspect an observation.',
  evaTitle:'Investigate with EVA',questionLabel:'Your question for EVA',send:'Send',privacy:'Ask about the data. Please avoid personal information.',
  detailTitle:'One observation, different places',detailIntro:'MERRA-2: one nearest grid cell per reference point. Values are not regional or biome averages.',
  limitsTitle:'What can we conclude?',trendLimit:'These snapshots cannot establish trends over decades. Vegetation indices (NDVI/EVI) are not present in these products.',
  download:'Download data and provenance',footer:'Educational demo · 2026 observations · no simulated data on this page',
  merra2:'Rainfall and heat extremes',airs:'Observed temperature',sentinel5p:'Atmospheric ozone',min:'Valid minimum',max:'Valid maximum',mean:'Mean of measurements',days:'days',
  grid:'Statistics use all valid grid cells, without area weighting. The map samples every 8th grid cell; no interpolation.',
  swath:'Statistics use quality-filtered observations. The map shows only the observed swath; areas without points have no measurements in this extract.',
  merraNote:'September 2026, global grid. Compare conditions between places. Missing heatwave values do not mean zero.',
  airsNote:'One overpass on January 1, 2026 across part of South America and the Pacific. Surface air temperature, quality 0 or 1; kelvin converted to °C. This is not a vegetation product.',
  sentinelNote:'One overpass on November 9, 2026. An ESA/Copernicus product accessed via Earthdata. This swath does not cover Brazil. qa_value ≥ 0.5 filter; mol/m² converted to Dobson units (DU).',
  local:'Local EVA · Gemini not configured',online:'Gemini · available',checking:'Checking connection…',greeting:'Hi! I’m EVA. Choose a source and variable. I can explain what was measured, compare values and help you understand the limits of the evidence.',
  placeholder:'What do these observations show?',suggestions:['Explain the selected variable.','Can we conclude a trend?','What is the coverage of these data?'],
  waiting:'Asking EVA…',quota:'Gemini’s quota has been reached. Try again shortly. ',unavailable:'Gemini is currently unavailable. ',fallback:'Local data summary: ',
  trendAnswer:'These files cannot establish a historical trend: MERRA-2 covers one month and AIRS/Sentinel-5P are single overpasses. We need comparable observations across multiple years.',
  noPoint:'Select a colored point to inspect its measurement and coordinates.',selected:'Selected point',missing:'No valid value',lat:'latitude',lon:'longitude',
  nearest:'Grid cell near',single:'A satellite snapshot',singleDetail:'The swath shows where the satellite observed. AIRS measures surface air temperature; Sentinel-5P measures the total atmospheric ozone column.',
  samples:'map points',localLabel:'Local response',sourceLabel:'Source',reset:'Context updated. Ask a question about your new selection.',
 }
};
let language = 'pt';
try { language = localStorage.getItem('eva-language') === 'en' ? 'en' : 'pt'; } catch {}
let data, world, selected = 'merra2', variable = 'drydays', aiOnline = false, busy = false, history = [], mapPoints = [];
let controller, requestVersion = 0, selectedPoint = null;
const t = k => copy[language][k];
const number = (v, digits = 1) => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', {maximumFractionDigits:digits}).format(v);
const current = () => data.datasets.find(d => d.id === selected);
const metric = () => current().metrics[variable];
const unit = () => metric().unit === 'days' ? t('days') : metric().unit;
const regions = {amazonia:{pt:'Amazônia',en:'Amazon'},cerrado:{pt:'Cerrado',en:'Cerrado'},nordeste:{pt:'Nordeste',en:'Northeast'},pantanal:{pt:'Pantanal',en:'Pantanal'},sudeste:{pt:'Sudeste',en:'Southeast'},sul:{pt:'Sul',en:'South'}};

function message(text, role = 'eva', label = '') {
 const box = document.createElement('div'); box.className = 'message ' + role;
 if (label) { const small = document.createElement('small'); small.textContent = label; box.append(small); }
 const content = document.createElement('span'); content.textContent = text; box.append(content);
 $('chat').append(box); $('chat').scrollTop = $('chat').scrollHeight; return box;
}
function resetChat() {
 controller?.abort();requestVersion++;busy=false;history=[];$('chat').replaceChildren();
 message(t('greeting'));$('send').disabled=false;
}
function updateLanguage() {
 document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en'; $('language').value = language;
 document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
 $('question').placeholder = t('placeholder'); $('ai-status').textContent = t(aiOnline ? 'online' : 'local');
 $('suggestions').replaceChildren();
 t('suggestions').forEach(q => {const b=document.createElement('button');b.textContent=q;b.onclick=()=>ask(q);$('suggestions').append(b);});
}
function button(text, on, action) {
 const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-pressed',String(on));b.onclick=action;return b;
}
function render() {
 updateLanguage();
 $('datasets').replaceChildren();
 data.datasets.forEach(d => {
  const b = button(d.name,selected===d.id,()=>{selected=d.id;variable=Object.keys(d.metrics)[0];selectedPoint=null;resetChat();render();});
  const sub=document.createElement('span');sub.textContent=t(d.id);b.append(sub);$('datasets').append(b);
 });
 $('dataset-title').textContent=current().name;
 $('period').textContent=current().period.replaceAll('T',' ').replaceAll('Z',' UTC');
 $('source').href=current().url;
 $('metrics').replaceChildren();
 Object.entries(current().metrics).forEach(([k,v])=>$('metrics').append(button(v.label[language],k===variable,()=>{variable=k;selectedPoint=null;resetChat();render();})));
 const m=metric();$('summary').replaceChildren();
 for(const [label,key] of [['min','min'],['mean','mean'],['max','max']]){
  const cell=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=t(label);value.textContent=number(m.stats[key])+' '+unit();cell.append(name,value);$('summary').append(cell);
 }
 $('sampling').textContent=number(m.points.length,0)+' '+t('samples')+' · '+t(selected==='merra2'?'grid':'swath');
 $('limitations').textContent=t(selected==='merra2'?'merraNote':selected==='airs'?'airsNote':'sentinelNote');
 $('legend-min').textContent=number(m.stats.min);$('legend-max').textContent=number(m.stats.max);$('map-unit').textContent=unit();
 $('point-readout').textContent=t('noPoint');
 const area=$('regions');area.replaceChildren();
 if(m.regions){
  area.className='regions';
  for(const [k,r] of Object.entries(m.regions)){
   const row=document.createElement('div');row.className='region';
   const name=document.createElement('span');name.textContent=regions[k][language];
   const value=document.createElement('strong');value.textContent=r.value===null?t('missing'):number(r.value)+' '+unit();
   const coord=document.createElement('small');coord.textContent=number(r.lat,3)+'°, '+number(r.lon,3)+'°';
   row.append(name,value,coord);
   const track=document.createElement('div');track.className='track';const fill=document.createElement('i');
   fill.style.width=r.value===null?'0%':Math.min(100,100*r.value/(Math.max(...Object.values(m.regions).map(x=>x.value||0))||1))+'%';track.append(fill);row.append(track);area.append(row);
  }
 }else{area.className='sample-note';area.textContent=t('singleDetail');}
 document.querySelector('[data-i18n="detailTitle"]').textContent=t(m.regions?'detailTitle':'single');
 document.querySelector('[data-i18n="detailIntro"]').textContent=m.regions?t('detailIntro'):current().period;
 drawMap();
}
function color(value) {
 const m=metric(),v=Math.max(0,Math.min(1,(value-m.stats.min)/(m.stats.max-m.stats.min||1)));
 const stops=[[19,116,192],[157,206,224],[241,211,125],[208,86,44]];
 const index=Math.min(2,Math.floor(v*3)),f=v*3-index;
 return 'rgb('+stops[index].map((a,i)=>Math.round(a+(stops[index+1][i]-a)*f)).join(',')+')';
}
function drawMap() {
 if(!data||!world)return;
 const canvas=$('map'),width=canvas.getBoundingClientRect().width,height=width/2,dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const x=canvas.getContext('2d');x.scale(dpr,dpr);x.fillStyle='#e8f1f8';x.fillRect(0,0,width,height);
 const project=([lo,la])=>[(lo+180)/360*width,(90-la)/180*height];
 x.strokeStyle='#cfdeea';x.lineWidth=.6;
 for(let lo=-180;lo<=180;lo+=60){x.beginPath();x.moveTo((lo+180)/360*width,0);x.lineTo((lo+180)/360*width,height);x.stroke();}
 for(let la=-60;la<=60;la+=30){x.beginPath();x.moveTo(0,(90-la)/180*height);x.lineTo(width,(90-la)/180*height);x.stroke();}
 x.fillStyle='#f9fbfd';x.strokeStyle='#9fb5c7';
 for(const f of world.features){
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const rings of polygons){x.beginPath();for(const ring of rings){let previous=null;ring.forEach(coord=>{const [a,b]=project(coord);if(previous===null||Math.abs(a-previous)>width/2)x.moveTo(a,b);else x.lineTo(a,b);previous=a;});x.closePath();}x.fill('evenodd');x.stroke();}
 }
 mapPoints=metric().points.map(p=>{const [a,b]=project(p);return {x:a,y:b,p};});
 const radius=selected==='merra2'?Math.max(1,width/230):Math.max(.9,width/600);
 for(const point of mapPoints){x.fillStyle=color(point.p[2]);x.beginPath();x.arc(point.x,point.y,radius,0,Math.PI*2);x.fill();}
 if(selectedPoint){const [a,b]=project(selectedPoint);x.strokeStyle='#182230';x.lineWidth=2;x.beginPath();x.arc(a,b,6,0,7);x.stroke();}
 canvas.setAttribute('aria-label',metric().label[language]+' · '+current().period+' · '+number(metric().points.length,0)+' '+t('samples'));
}
$('map').onclick=e=>{
 const rect=$('map').getBoundingClientRect(),a=e.clientX-rect.left,b=e.clientY-rect.top;
 let closest=null,distance=Infinity;
 for(const point of mapPoints){const d=(point.x-a)**2+(point.y-b)**2;if(d<distance){distance=d;closest=point;}}
 if(!closest||distance>20**2){$('point-readout').textContent=t('noPoint');selectedPoint=null;drawMap();return;}
 selectedPoint=closest.p;const [lo,la,v]=closest.p;
 $('point-readout').textContent=t('selected')+': '+number(v)+' '+unit()+' · '+t('lat')+' '+number(la,4)+'° · '+t('lon')+' '+number(lo,4)+'°';drawMap();
};
function localAnswer(q){
 if(/trend|tend[eê]ncia|veget|ndvi|evi/i.test(q))return t('trendAnswer')+' '+t('trendLimit');
 const m=metric();return `${current().name} · ${current().period}\n${m.label[language]}: ${number(m.stats.min)}–${number(m.stats.max)} ${unit()}.\n${t(selected==='merra2'?'merraNote':selected==='airs'?'airsNote':'sentinelNote')}`;
}
async function ask(question){
 if(busy||!question.trim())return;
 question=question.trim().slice(0,1000);message(question,'user');$('question').value='';
 if(!aiOnline){message(localAnswer(question),'eva',t('localLabel'));return;}
 busy=true;$('send').disabled=true;const pending=message(t('waiting'));const version=requestVersion;
 controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch('/api/eva',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({question,dataset:selected,metric:variable,language,history:history.slice(-6)})});
  const result=await response.json();if(version!==requestVersion)return;pending.remove();
  if(!response.ok){message(t(response.status===429?'quota':'unavailable')+t('fallback')+localAnswer(question),'eva',t('localLabel'));return;}
  message(result.text,'eva','Gemini · '+current().name);history.push({role:'user',text:question},{role:'assistant',text:result.text.slice(0,2000)});
 }catch{if(version===requestVersion){pending.remove();message(t('unavailable')+localAnswer(question),'eva',t('localLabel'));}}
 finally{clearTimeout(timer);if(version===requestVersion){busy=false;$('send').disabled=false;}}
}
$('ask-form').onsubmit=e=>{e.preventDefault();ask($('question').value);};
$('question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask($('question').value);}};
$('language').onchange=e=>{language=e.target.value;try{localStorage.setItem('eva-language',language);}catch{}selectedPoint=null;resetChat();render();};
new ResizeObserver(()=>drawMap()).observe($('map'));
updateLanguage();$('ai-status').textContent=t('checking');
try{
 const responses=await Promise.all([fetch('/earthdata-demo.json'),fetch('/world.json')]);
 if(responses.some(r=>!r.ok))throw new Error('data');
 [data,world]=await Promise.all(responses.map(r=>r.json()));render();resetChat();
 try{const status=await fetch('/api/eva');if(status.ok)aiOnline=Boolean((await status.json()).ai);}catch{}
 $('ai-status').textContent=t(aiOnline?'online':'local');
}catch{
 $('dataset-title').textContent=language==='pt'?'Não foi possível carregar os dados. Recarregue a página.':'Could not load the data. Please reload.';
 $('ai-status').textContent=t('local');$('send').disabled=true;
}
