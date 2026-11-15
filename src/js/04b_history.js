/* Time-series layer: annual observations, never an interpolation between different products. */
const historyCache=new Map();
const historyRanges=Object.fromEntries(['T2M','PRECTOTCORR'].map(k=>{const values=HISTORY.sites.flatMap(s=>s.series[k].map(p=>p.value));return[k,{min:Math.min(...values),max:Math.max(...values)}];}));
const historyParameter=()=>VAR==='PREC'?'PRECTOTCORR':'T2M';
const historySeries=()=>historySite.series[historyParameter()];
function historyDataset(){return{id:'power-history',name:'NASA POWER / MERRA-2',url:historySite.sourceUrl,period:`${HISTORY.start}–${HISTORY.end}`,coverage:'point-history'};}
function historyMetric(){
 const series=historySeries(),values=series.map(p=>p.value),k=historyParameter();
 const sites=HISTORY.sites.some(s=>s.latitude===historySite.latitude&&s.longitude===historySite.longitude)?HISTORY.sites:[...HISTORY.sites,historySite];
 const colorValues=sites.flatMap(s=>{const p=s.series[k].find(p=>p.year===year);if(!p)return[];const baseline=s.series[k].filter(p=>p.year>=1981&&p.year<=2010);const mean=baseline.reduce((a,p)=>a+p.value,0)/baseline.length;return[k==='T2M'?p.value-mean:mean>0?(p.value-mean)/mean*100:0];});
 return{sites:sites.filter(s=>s.series[k].some(p=>p.year===year)),colorValues,label:{pt:k==='T2M'?'Temperatura média anual':'Chuva média diária por ano',en:k==='T2M'?'Annual mean air temperature':'Annual mean daily rainfall'},unit:k==='T2M'?'°C':'mm/day',points:sites.flatMap(s=>{const p=s.series[k].find(p=>p.year===year);return p?[[s.longitude,s.latitude,p.value]]:[];}),stats:{min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length,count:values.length}};
}
function colorRange(m){
 if(m.visualRange)return m.visualRange;
 if(dataMode==='history')return{min:VAR==='T2M'?-3:-60,max:VAR==='T2M'?3:60,log:false};
 const range=m.stats;return{min:range.min,max:range.max,log:m.unit==='mm/day'};
}
function seriesTrend(series){const n=series.length;if(n<2)return null;const mx=series.reduce((a,p)=>a+p.year,0)/n,my=series.reduce((a,p)=>a+p.value,0)/n;const den=series.reduce((a,p)=>a+(p.year-mx)**2,0);return den?series.reduce((a,p)=>a+(p.year-mx)*(p.value-my),0)/den:null;}
const signed=(v,d=2)=>(v>0?'+':'')+nf(v,d);
function historyInsight(){
 const series=historySeries(),first=series[0],last=series.at(-1),slope=seriesTrend(series),m=historyMetric();
 return `<b>${historySite.name||tx('Local selecionado','Selected location')}</b> · ${nf(historySite.latitude,2)}°, ${nf(historySite.longitude,2)}°. ${tx('De','From')} ${first.year} ${tx('a','to')} ${last.year}, ${tx('a tendência linear é','the linear trend is')} <b>${signed(slope*10)} ${m.unit}/${tx('década','decade')}</b>. ${tx('Cada ponto do gráfico é uma média anual real.','Every chart point is a real annual mean.')}`;
}
function tabsHTML(){return Object.entries(VARS).map(([k,v])=>`<button data-var="${k}" class="${(dataMode==='history'?k===VAR:k==='OZONE')?'on':''}" style="--vc:${v.color}"><svg viewBox="0 0 24 24">${v.icon}</svg>${v.name}</button>`).join('');}
function historyMonitor(){
 const m=historyMetric(),series=historySeries(),first=series[0],last=series.at(-1),slope=seriesTrend(series),value=activeValue();
 return `<div class="lcol"><div class="ftabs">${tabsHTML()}</div><div class="mcard">
 <div><div class="kh"><span class="lbl">${historySite.name||tx('Local selecionado','Selected location')}</span><span class="lbl">${year}</span></div><div class="big">${nf(value)}<small>${m.unit}</small></div></div>
 <div class="badge ns"><i></i>${historyLoading?tx('Consultando a NASA…','Loading NASA observations…'):tx('Histórico real','Real history')+' · '+HISTORY.start+'–'+HISTORY.end}</div>
 <label class="observation-select"><span class="lbl">${tx('Explorar o mundo','Explore the world')}</span><select id="historyPlace" aria-label="${tx('Local do histórico','History location')}">${historySite.id?'':`<option selected>${nf(historySite.latitude,2)}°, ${nf(historySite.longitude,2)}°</option>`}${HISTORY.sites.map(s=>`<option value="${s.id}" ${s.id===historySite.id?'selected':''}>${s.name}</option>`).join('')}</select></label>
 <canvas id="cMain" class="chart" role="img"></canvas>
 <div class="strip"><div><div class="lbl">${tx('Tendência linear','Linear trend')}</div><div class="v">${signed(slope*10)}<small> ${m.unit}/${tx('década','decade')}</small></div></div><div><div class="lbl">${first.year} → ${last.year}</div><div class="v">${signed(last.value-first.value)}<small> ${m.unit}</small></div></div><div><div class="lbl">${tx('Anos válidos','Valid years')}</div><div class="v">${series.length}</div></div></div>
 <div class="srcbox"><span class="nasa">NASA</span><div>${tx('Fonte','Source')}: <a href="${historySite.sourceUrl}" target="_blank" rel="noopener"><b>POWER / MERRA-2</b></a><br>${m.label[LANG]} · ${m.unit}<br>${nf(historySite.latitude,3)}°, ${nf(historySite.longitude,3)}°</div></div>
 <div class="lbl observation-caption">${tx('Arraste a timeline para consultar um ano. Clique em qualquer lugar do globo para buscar o histórico local. As cores seguem o filtro e a legenda do globo; extremos da escala são saturados. Países coloridos resumem apenas as amostras disponíveis; não são médias nacionais.','Drag the timeline to inspect a year. Click anywhere on the globe to load its history. Colors follow the globe filter and legend; scale extremes are saturated. Colored countries summarize available samples only, not national averages.')}</div>
 </div></div><div id="slotGlobe" style="position:relative;min-height:0"></div><div class="rcol">
 <div class="live"><div class="ic"><svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg></div><h3>${tx('Aprender para cuidar','Understand to care')}</h3><p>${tx('A EVA conecta as evidências ao cuidado com o planeta.','EVA connects observations to caring for our planet.')}</p><button id="awareness">${tx('O que isso significa?','What does this mean?')}</button></div>
 <div class="insight"><div class="tips"><div class="tip"><span style="background:#EAF5FE">↔</span>${tx('Arraste o globo para explorar','Drag the globe to explore')}</div><div class="tip"><span style="background:#FFF4E2">◷</span>${tx('Volte no tempo pela timeline','Travel through years on the timeline')}</div><div class="tip"><span style="background:#F1F9E4">◎</span>${tx('Clique em um local do mundo','Click a location anywhere')}</div></div><div class="bub"><h4>${tx('EVA explica','EVA’s insight')} <i>${year}</i></h4><p id="insightTxt">${historyInsight()}</p><div class="acts"><button class="pri" id="askEva">${tx('Perguntar à EVA','Ask EVA')}</button><button id="explainSig">${tx('Entender a tendência','Understand the trend')}</button></div></div><svg class="mascot" viewBox="0 0 120 140" id="mascot" role="img" aria-label="EVA"><use href="#eva-curious"/></svg><span class="eva-mood-label" id="evaMoodLabel"></span></div>
 </div>`;
}
function drawHistoryChart(id){
 const cv=$(id);if(!cv)return;CH[id]=true;const series=historySeries(),m=historyMetric(),r=cv.getBoundingClientRect();if(!r.width)return;
 const ratio=Math.min(devicePixelRatio||1,2);cv.width=r.width*ratio;cv.height=r.height*ratio;const x=cv.getContext('2d');x.scale(ratio,ratio);
 const W=r.width,H=r.height,l=38,right=8,top=26,bottom=29,w=W-l-right,h=H-top-bottom;
 const min=m.stats.min,max=m.stats.max,pad=Math.max((max-min)*.12,.1),lo=min-pad,hi=max+pad;
 const X=y=>l+(y-HISTORY.start)/(HISTORY.end-HISTORY.start)*w,Y=v=>top+(hi-v)/(hi-lo)*h;
 x.font='10px Poppins';x.fillStyle='#526071';x.textAlign='left';x.fillText(m.label[LANG]+' · '+m.unit,l,12);
 for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3;x.strokeStyle='#e8edf3';x.beginPath();x.moveTo(l,Y(v));x.lineTo(l+w,Y(v));x.stroke();x.textAlign='right';x.fillText(nf(v,1),l-5,Y(v)+3);}
 x.textAlign='center';historyTicks().forEach(y=>{x.textAlign=y===HISTORY.start?'left':y===HISTORY.end?'right':'center';x.fillText(String(y),X(y),H-6);});
 x.beginPath();let previousYear=null;for(const p of series){if(previousYear===null||p.year!==previousYear+1)x.moveTo(X(p.year),Y(p.value));else x.lineTo(X(p.year),Y(p.value));previousYear=p.year;}x.strokeStyle=VARS[VAR].color;x.lineWidth=2.5;x.lineJoin='round';x.stroke();
 const slope=seriesTrend(series),mx=series.reduce((a,p)=>a+p.year,0)/series.length,my=series.reduce((a,p)=>a+p.value,0)/series.length;
 x.setLineDash([4,4]);x.lineWidth=1;x.strokeStyle='#65788a';x.beginPath();x.moveTo(X(series[0].year),Y(my+slope*(series[0].year-mx)));x.lineTo(X(series.at(-1).year),Y(my+slope*(series.at(-1).year-mx)));x.stroke();x.setLineDash([]);
 x.strokeStyle='#0874be';x.lineWidth=1;x.beginPath();x.moveTo(X(year),top);x.lineTo(X(year),top+h);x.stroke();
 const selected=series.find(p=>p.year===year);if(selected){x.fillStyle='white';x.strokeStyle='#0874be';x.lineWidth=2;x.beginPath();x.arc(X(year),Y(selected.value),4.5,0,7);x.fill();x.stroke();const label=year+' · '+nf(selected.value)+' '+m.unit;x.fillStyle='#182230';x.font='10px Poppins';x.textAlign='right';x.fillText(label,l+w,top+10);}
 cv.setAttribute('aria-label',m.label[LANG]+', '+HISTORY.start+'–'+HISTORY.end+'. '+year+': '+nf(selected?.value)+' '+m.unit+'. '+tx('Linha tracejada: regressão linear.','Dashed line: linear regression.'));
 cv.onclick=e=>setYear(Math.round(HISTORY.start+(e.clientX-cv.getBoundingClientRect().left-l)/w*(HISTORY.end-HISTORY.start)));
}
function configureTimeline(){
 const slider=$('slider'),enabled=dataMode==='history';$('tl').style.display=enabled?'flex':'none';let snapshot=$('snapshotDate');if(!snapshot){snapshot=document.createElement('div');snapshot.id='snapshotDate';$('stage').appendChild(snapshot);}snapshot.hidden=enabled;snapshot.textContent=tx('Recorte: ','Snapshot: ')+dateLabel()+' · '+tx('Sem série anual. Para ver a evolução, use Temperatura ou Chuva.','No annual series. For change over time, use Temperature or Rainfall.');slider.min=HISTORY.start;slider.max=HISTORY.end;slider.step=1;slider.value=year;slider.disabled=!enabled;$('play').disabled=!enabled;
 $('play').title=enabled?tx('Reproduzir evolução anual','Play annual evolution'):tx('Arquivo com uma única data, sem histórico','Single-date file, no time series');
 slider.setAttribute('aria-label',enabled?tx('Ano das observações','Observation year'):tx('Sem série histórica neste arquivo','No historical series for this file'));
 const percent=enabled?(year-HISTORY.start)/(HISTORY.end-HISTORY.start)*100:100;
 document.querySelector('#trk .fill').style.width=percent+'%';document.querySelector('#trk .knob').style.left=percent+'%';
 document.querySelectorAll('#trk .tk').forEach(e=>e.remove());historyTicks().forEach(y=>{const label=document.createElement('span');label.className='tk';label.textContent=y;label.style.left=(y-HISTORY.start)/(HISTORY.end-HISTORY.start)*100+'%';$('trk').appendChild(label);});
 $('tl').classList.toggle('timeline-unavailable',!enabled);$('tl').setAttribute('aria-label',enabled?tx('Timeline · NASA POWER · médias anuais','Timeline · NASA POWER · annual means'):tx('Este arquivo cobre apenas '+dateLabel(),'This file covers only '+dateLabel()));
}
function focusHistorySite(id){const site=HISTORY.sites.find(s=>s.id===id);if(!site)return;historyRequest++;historyLoading=false;historySite=site;hist.length=0;render();flyRegion();showLocationInsight();setEvaMood('investigative');}
async function loadHistoryLocation(lat,lon){
 lat=+lat.toFixed(3);lon=+lon.toFixed(3);const key=lat+','+lon,request=++historyRequest;historyLoading=true;render();setEvaMood('thoughtful');
 try{let site=historyCache.get(key);if(!site){const res=await fetch(`/api/climate?lat=${lat}&lon=${lon}`,{signal:AbortSignal.timeout(28000)});if(!res.ok)throw new Error('nasa');site=await res.json();historyCache.set(key,site);}if(request!==historyRequest)return;historySite=site;historyLoading=false;hist.length=0;if(dataMode==='history'){render();setEvaMood('investigative');}return site;}
 catch{if(request!==historyRequest)return;historyLoading=false;if(dataMode==='history'){render();evaSay(tx('A NASA não respondeu para esse ponto. Mantive o histórico anterior; tente outro local ou uma das amostras disponíveis.','NASA did not respond for that point. I kept the previous history; try another location or an available sample.'),{speak:false});setEvaMood('curious');}return null;}
}
function showFile(v){measurementPointsOn=v!=='PREC';climateFilter='all';stopPlay();hideLocationInsight();historyRequest++;historyLoading=false;dataMode='files';VAR=v;region='brasil';selectedObservation=null;hist.length=0;render();animateMonitorPanels();flyRegion();setEvaMood('investigative');}
function showQuizData(show){stopPlay();dataMode='files';VAR=show.v;if(show.m)merraMetric=show.m;region=show.r;selectedObservation=null;updateGlobe();updateMarkers(true);flyRegion();}
function configureGlobeTools(){
 if($('globeTools'))return;const tools=document.createElement('div');tools.id='globeTools';tools.className='globe-tools';tools.innerHTML=`<button id="worldHome" title="${tx('Visão global','Global view')}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 6 6 12 0 18-6-6-6-12 0-18"/></svg><span>${tx('Mundo','World')}</span></button><button id="focusData">${tx('Ver dados','Focus data')}</button><button id="baseStyle" aria-pressed="true">${tx('Satélite','Satellite')}</button><span class="globe-help">${tx('Arraste para girar · clique para investigar','Drag to rotate · click to investigate')}</span>`;$('stage').appendChild(tools);const credit=document.createElement('a');credit.id='satelliteCredit';credit.className='satellite-credit';credit.target='_blank';credit.rel='noopener';$('stage').appendChild(credit);$('baseStyle').onclick=()=>{baseStyle=baseStyle==='satellite'?'illustrated':'satellite';refreshBaseStyle();};refreshBaseStyle();$('worldHome').onclick=()=>{stopPlay();hideLocationInsight();flyTo(15,20,HOME_D);setEvaMood('curious');};$('focusData').onclick=()=>{flyRegion();showLocationInsight();setEvaMood('investigative');};
}
const selectionMarker=document.createElement('div');selectionMarker.className='mk global-selection';selectionMarker.style.pointerEvents='none';selectionMarker.innerHTML='<div class="pt"></div><div class="tg"><b></b><small></small></div>';selectionMarker.style.setProperty('--c','#087cf6');mkWrap.appendChild(selectionMarker);
function updateSelectedMarker(){
 const lat=dataMode==='history'?historySite.latitude:selectedObservation?.lat,lon=dataMode==='history'?historySite.longitude:selectedObservation?.lon;
 if(dataMode==='history'&&climateFilter!=='all'&&!globeVisiblePoints.some(p=>p[0]===lon&&p[1]===lat)){selectionMarker.classList.add('hidden');selectionMarker.setAttribute('aria-hidden','true');return;}
 if(lat===undefined){selectionMarker.classList.add('hidden');selectionMarker.setAttribute('aria-hidden','true');return;}
 const pos=setFromLatLon(new THREE.Vector3(),lat,lon,1.025),front=pos.clone().normalize().dot(camera.position.clone().normalize())>1/camera.position.length()+.03;
 const r=host.getBoundingClientRect();tmpV.copy(pos).project(camera);selectionMarker.style.left=(tmpV.x*.5+.5)*r.width+'px';selectionMarker.style.top=(-tmpV.y*.5+.5)*r.height+'px';selectionMarker.classList.toggle('hidden',!front);selectionMarker.setAttribute('aria-hidden',String(!front));
 selectionMarker.querySelector('b').textContent=nf(activeValue())+' '+vunit(activeMetric());selectionMarker.querySelector('small').textContent=dataMode==='history'?(historySite.name||nf(lat,1)+'°, '+nf(lon,1)+'°'):nf(lat,1)+'°, '+nf(lon,1)+'°';
}
function angularDistance(lat,lon,otherLat,otherLon){const rad=Math.PI/180;const dot=Math.sin(lat*rad)*Math.sin(otherLat*rad)+Math.cos(lat*rad)*Math.cos(otherLat*rad)*Math.cos((lon-otherLon)*rad);return Math.acos(Math.max(-1,Math.min(1,dot)))/rad;}
function nearestObservation(points,lat,lon,maxDegrees){let best=null,distance=maxDegrees;for(const p of points){const d=angularDistance(lat,lon,p[1],p[0]);if(d<=distance){best=p;distance=d;}}return best;}
