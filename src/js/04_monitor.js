/* The approved shell, earth mesh, materials and mascot stay intact. Only observations change. */
let VIEW='monitor',ROLE='teacher',VAR='T2M',region='brasil',year=2025,merraMetric='RX1Day',selectedObservation=null;
let dataMode='history',historySite=HISTORY.sites.find(site=>site.id==='amazon')||HISTORY.sites[0],historyLoading=false,historyRequest=0,cloudTransition=null;
const VARS={
 T2M:{get name(){return tx('Temperatura','Temperature');},short:'Temp',color:'#FFAE38',icon:'<path d="M12 3a2 2 0 0 0-2 2v8.5a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2z"/><path d="M12 14v3"/>'},
 PREC:{get name(){return tx('Chuva','Rainfall');},short:'MERRA-2',color:'#309CEC',icon:'<path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 7.5a3.8 3.8 0 0 1 .5 7.5"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>'},
 OZONE:{get name(){return tx('Arquivos','Files');},short:'O₃',color:'#82C610',icon:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/><ellipse cx="12" cy="12" rx="5" ry="10"/>'},
};
const activeDataset=()=>dataMode==='history'?historyDataset():datasetFor(VAR),activeMetric=()=>dataMode==='history'?historyMetric():metricFor(VAR,merraMetric);
const activeValue=()=>dataMode==='history'?historySeries().find(p=>p.year===year)?.value??null:selectedObservation?.value??(VAR==='PREC'&&region!=='brasil'?activeMetric().regions[region].value:activeMetric().stats.mean);
const dateLabel=()=>dataMode==='history'?String(year):VAR==='PREC'?tx('setembro de 2026','September 2026'):VAR==='T2M'?tx('1º de janeiro de 2026','January 1, 2026'):tx('9 de novembro de 2026','November 9, 2026');
const CH={};
function dataColor(value,m=activeMetric()){
 const range=colorRange(m),raw=(value-range.min)/(range.max-range.min||1);
 const a=THREE.MathUtils.clamp(range.log?Math.log1p(Math.max(0,value-range.min))/Math.log1p(range.max-range.min):raw,0,1);
 const stops=m.isLevel?(VAR==='PREC'?['#d3b477','#74d8d5','#2488d0','#163598']:['#4133a1','#2189da','#79d5dd','#fff0a0','#ef7b24','#b91c32']):dataMode==='history'?(VAR==='PREC'?['#925019','#d7a86b','#f5f7fa','#39acc6','#1453d2']:['#174bd8','#6dbbe9','#f5f7fa','#ffab34','#d62827']):['#1649ce','#00b6bc','#ffe04e','#e84126'];const steps=stops.length-1,i=Math.min(steps-1,Math.floor(a*steps));
 return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i+1]),a*steps-i);
}
function insightHTML(){
 if(dataMode==='history')return historyInsight();
 const d=activeDataset(),m=activeMetric(),value=activeValue();
 if(selectedObservation)return `${tx('Ponto observado','Observed point')}: <b>${nf(value)} ${vunit(m)}</b> · ${nf(selectedObservation.lat,3)}°, ${nf(selectedObservation.lon,3)}°. ${d.name} · ${dateLabel()}.`;
 if(VAR==='PREC'&&region!=='brasil')return `<b>${rname(region)}</b>: ${nf(value)} ${vunit(m)} · ${dateLabel()}. ${tx('Uma célula de grade próxima ao ponto de referência, não a média regional.','One nearest grid cell, not a regional average.')}`;
 return `<b>${d.name}</b> · ${dateLabel()}. ${tx('Média das medições válidas','Mean of valid measurements')}: <b>${nf(value)} ${vunit(m)}</b>. ${VAR==='PREC'?tx('Grade global sem ponderação por área.','Global grid without area weighting.'):tx('Apenas a faixa observada pelo satélite.','Only the swath observed by the satellite.')} ${tx('Este recorte não define uma tendência histórica.','This snapshot does not establish a historical trend.')}`;
}
function viewMonitor(){
 if(dataMode==='history')return historyMonitor();
 const d=activeDataset(),m=activeMetric(),V=VARS[VAR],value=activeValue();
 const loc=selectedObservation?tx('Ponto observado','Observed point'):VAR==='PREC'&&region!=='brasil'?rname(region):VAR==='PREC'?tx('Grade global','Global grid'):tx('Faixa observada','Observed swath');
 const tabs=Object.entries(VARS).map(([k,v])=>`<button data-var="${k}" class="${(dataMode==='files'?k==='OZONE':k===VAR)?'on':''}" style="--vc:${v.color}"><svg viewBox="0 0 24 24">${v.icon}</svg>${v.name}</button>`).join('');
 const notes=VAR==='PREC'?tx('MERRA-2 · valores de células, sem interpolação.','MERRA-2 · grid-cell values, no interpolation.'):VAR==='T2M'?tx('AIRS · observações com qualidade validada, convertidas para °C.','AIRS · quality-checked observations, converted to °C.'):tx('Copernicus · ozônio em unidades Dobson (DU), com qualidade validada. Esta passagem não cobre o Brasil.','Copernicus · quality-checked ozone in Dobson units (DU). This swath does not cover Brazil.');
 return `<div class="lcol"><div class="ftabs">${tabs}</div><div class="mcard">
 <div><div class="kh"><span class="lbl">${loc}</span><span class="lbl">${selectedObservation||region!=='brasil'?tx('Medição','Measurement'):tx('Média válida','Valid mean')}</span></div><div class="big">${nf(value)}<small>${vunit(m)}</small></div></div>
 ${challengeFilesHTML()}
 <div class="badge ns"><i></i>${tx('Observações reais','Real observations')} · ${dateLabel()}</div>
 ${fileMetricHTML(d,m)}
 <canvas id="cMain" class="chart" role="img"></canvas>
 <div class="strip"><div><div class="lbl">${tx('Mínimo','Minimum')}</div><div class="v">${nf(m.stats.min)}</div></div><div><div class="lbl">${tx('Máximo','Maximum')}</div><div class="v">${nf(m.stats.max)}</div></div><div><div class="lbl">${tx('Válidas','Valid')}</div><div class="v">${nf(m.stats.count,0)}</div></div></div>
 <div class="srcbox"><span class="nasa">${VAR==='OZONE'?'ESA':'NASA'}</span><div>${tx('Fonte','Source')}: <a href="${d.url}" target="_blank" rel="noopener"><b>${d.name}</b></a><br>${notes}</div></div>
 <div class="lbl observation-caption">${tx('Estatísticas: todas as medições válidas. Países: média das amostras exibidas, sem ponderação por área; cobertura pode ser parcial.','Statistics: all valid measurements. Countries: mean of displayed samples without area weighting; coverage may be partial.')}</div>
 </div></div><div id="slotGlobe" style="position:relative;min-height:0"></div><div class="rcol">
 <div class="live"><div class="ic"><svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg></div><h3>${tx('Aula ao vivo','Live class')}</h3><p>${tx('Investigue estes dados com um quiz.<br>Turma de demonstração simulada.','Investigate these observations in a quiz.<br>Simulated demonstration class.')}</p><button data-go="class">${tx('Explorar o quiz →','Explore the quiz →')}</button></div>
 <div class="insight"><div class="tips"><div class="tip"><span style="background:#FFF4E2">◎</span>${tx('Toque um ponto no globo','Tap an observation on the globe')}</div><div class="tip"><span style="background:#EAF5FE">↔</span>${tx('Alterne os três recortes de 2026','Switch between the three 2026 snapshots')}</div><div class="tip"><span style="background:#F1F9E4">◷</span>${tx('Confira a data e a cobertura','Check the date and coverage')}</div></div>
 <div class="bub"><h4>${tx('EVA explica','EVA’s insight')} <i>${d.name.split(' /')[0]}</i></h4><p id="insightTxt">${insightHTML()}</p><div class="acts"><button class="pri" id="askEva">${tx('Perguntar à EVA','Ask EVA')}</button><button id="explainSig">${tx('Posso concluir uma tendência?','Can we infer a trend?')}</button></div></div><svg class="mascot" viewBox="0 0 120 140" id="mascot"><use href="#botSym"/></svg></div></div>`;
}
function monitorAfter(){
 drawChart('cMain');
 document.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{if(VAR!==b.dataset.file)showFile(b.dataset.file);});
 document.querySelectorAll('[data-file-metric]').forEach(b=>b.onclick=()=>{if(merraMetric===b.dataset.fileMetric)return;merraMetric=b.dataset.fileMetric;selectedObservation=null;hist.length=0;hideLocationInsight();render();animateMonitorPanels();setEvaMood('investigative');});
 if($('historyPlace'))$('historyPlace').onchange=e=>focusHistorySite(e.target.value);
 if($('awareness'))$('awareness').onclick=()=>awarenessInsight();
 document.querySelectorAll('[data-var]').forEach(b=>b.onclick=()=>setVar(b.dataset.var));
 if($('metricSelect'))$('metricSelect').onchange=e=>{merraMetric=e.target.value;selectedObservation=null;hist.length=0;render();setEvaMood('investigative');};
 $('askEva').onclick=()=>openEva(true);$('mascot').onclick=()=>openEva(true);
 $('explainSig').onclick=()=>{openEva(true);ask(tx('Podemos concluir uma tendência com estes arquivos?','Can we establish a trend from these files?'));};
 let bb=$('backBr');if(!bb){bb=document.createElement('button');bb.id='backBr';bb.className='backBr';$('stage').appendChild(bb);bb.onclick=()=>{selectedObservation=null;region='brasil';render();flyTo(15,20,HOME_D);};}
 bb.textContent=tx('← Voltar ao recorte','← Back to snapshot');bb.classList.toggle('show',dataMode==='files'&&(region!=='brasil'||Boolean(selectedObservation)));
 configureTimeline();configureGlobeTools();$('worldHome').querySelector('span').textContent=tx('Mundo','World');$('focusData').textContent=tx('Ver dados','Focus data');document.querySelector('.globe-help').textContent=tx('Arraste para girar · clique para investigar','Drag to rotate · click to investigate');setEvaMood(dataMode==='history'?'curious':'investigative');
}
function drawChart(id){
 if(dataMode==='history')return drawHistoryChart(id);
 const cv=$(id);if(!cv)return;CH[id]=true;
 const m=activeMetric(),R=cv.getBoundingClientRect();if(!R.width)return;
 const d=Math.min(devicePixelRatio||1,2);cv.width=R.width*d;cv.height=R.height*d;const x=cv.getContext('2d');x.scale(d,d);
 const W=R.width,H=R.height,l=34,b=40,top=27,w=W-l-8,h=H-top-b;
 let bars,labels,title;
 if(VIEW==='class'&&VAR==='PREC'){bars=RKEYS.map(k=>m.regions[k].value);labels=RKEYS.map(k=>rname(k).slice(0,4));title=tx('Células de referência','Reference grid cells');}
 else{const n=8;bars=Array(n).fill(0);for(const p of m.points){const i=Math.min(n-1,Math.floor((p[2]-m.stats.min)/(m.stats.max-m.stats.min||1)*n));bars[i]++;}labels=bars.map((_,i)=>nf(m.stats.min+(i+.5)*(m.stats.max-m.stats.min)/n,0));title=tx('Distribuição dos pontos exibidos','Distribution of displayed observations');}
 const max=Math.max(1,...bars.filter(v=>v!==null));
 x.font='11px Poppins';x.fillStyle='#66768a';x.textAlign='left';x.fillText(title,l,12);
 for(let i=0;i<=3;i++){const y=top+h-i/3*h;x.strokeStyle='#edf1f6';x.beginPath();x.moveTo(l,y);x.lineTo(l+w,y);x.stroke();x.textAlign='right';x.fillText(nf(i*max/3,0),l-5,y+3);}
 bars.forEach((v,i)=>{const bw=w/bars.length,xx=l+i*bw+bw*.15,hh=v===null?0:v/max*h;x.fillStyle=VIEW==='class'&&VAR==='PREC'&&RKEYS[i]===region?'#182230':VARS[VAR].color;x.fillRect(xx,top+h-hh,bw*.7,hh);x.textAlign='center';x.font='9px Poppins';x.fillStyle='#526579';x.fillText(v===null?'—':labels[i],xx+bw*.35,top+h+15);});
 x.textAlign='center';x.font='10px Poppins';x.fillText(VIEW==='class'&&VAR==='PREC'?vunit(m):vunit(m)+' · '+tx('contagem de pontos','point count'),l+w/2,H-3);
 cv.setAttribute('aria-label',title+'. '+(VIEW==='class'&&VAR==='PREC'?RKEYS.map((k,i)=>rname(k)+': '+nf(bars[i])+' '+vunit(m)).join('; '):tx('Histograma de','Histogram of')+' '+nf(m.points.length,0)+' '+tx('observações','observations')));
 cv.onclick=VIEW==='class'&&VAR==='PREC'?e=>{const i=Math.floor((e.clientX-cv.getBoundingClientRect().left-l)/w*RKEYS.length);if(i>=0&&i<RKEYS.length)setRegion(RKEYS[i]);}:null;
}
addEventListener('resize',()=>Object.keys(CH).forEach(drawChart));

/* Actual geolocated samples on the original 3D globe; no regional interpolation. */
const pointGeometry=new THREE.BufferGeometry();
const pointSprite=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='white';x.beginPath();x.arc(32,32,27,0,Math.PI*2);x.fill();return new THREE.CanvasTexture(c);})();
const pointMaterial=new THREE.PointsMaterial({size:10,vertexColors:true,map:pointSprite,alphaTest:.2,transparent:true,depthWrite:false,sizeAttenuation:false,toneMapped:false});
const observationCloud=new THREE.Points(pointGeometry,pointMaterial);observationCloud.renderOrder=6;scene.add(observationCloud);let cloudKey='',globeVisiblePoints=[];
const observationOutline=new THREE.Points(pointGeometry,new THREE.PointsMaterial({size:14,color:'#ffffff',transparent:true,depthWrite:false,map:pointSprite,alphaTest:.2,sizeAttenuation:false,toneMapped:false}));observationOutline.renderOrder=5;scene.add(observationOutline);
function updateGlobe(){
 const d=activeDataset(),m=globeMetric(activeMetric()),key=climateFilter+'|'+dataMode+'|'+VAR+'|'+merraMetric+(dataMode==='history'?'|'+year+'|'+historySite.latitude+'|'+historySite.longitude:'');
 globeVisiblePoints=m.points;pointMaterial.size=dataMode==='history'?9:3.5;observationOutline.material.size=dataMode==='history'?12:4.5;paintCountrySurface(m,key);updateVisualLayers();
 overlayMat.uniforms.uData.value=0;overlayMat.uniforms.uImp.value=0;overlayMat.uniforms.uVeil.value=0;overlay.visible=false;
 if(key!==cloudKey){cloudKey=key;const previous=pointGeometry.getAttribute('color')?.array.slice();const positions=[],colors=[];for(const [index,[lon,lat,value]] of m.points.entries()){const p=setFromLatLon(new THREE.Vector3(),lat,lon,1.009);positions.push(p.x,p.y,p.z);const c=dataColor(m.colorValues?m.colorValues[index]:value,m);colors.push(c.r,c.g,c.b);}pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));pointGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));pointGeometry.computeBoundingSphere();if(previous?.length===colors.length&&!reducedMotion.matches){cloudTransition={from:previous,to:new Float32Array(colors),start:performance.now()};}else cloudTransition=null;}
 $('stLbl').textContent=d.name+' · '+m.label[LANG];$('hYear').textContent=dataMode==='history'?year:VAR==='PREC'?'09/2026':VAR==='T2M'?'01/2026':'11/2026';
 $('legTxt').textContent=dataMode==='history'?(m.visualLabel||tx('Anomalia vs 1981–2010 · ','Anomaly vs 1981–2010 · ')+(VAR==='T2M'?'°C':'%')):(colorRange(m).log?tx('Escala log · ','Log scale · '):tx('Escala linear · ','Linear scale · '))+vunit(m);
 const ends=$('legEnds').children;[colorRange(m).min,colorRange(m).log?Math.expm1(Math.log1p(colorRange(m).max-colorRange(m).min)/2)+colorRange(m).min:(colorRange(m).min+colorRange(m).max)/2,colorRange(m).max].forEach((v,i)=>ends[i].textContent=(dataMode==='history'&&i===0?'≤ ':dataMode==='history'&&i===2?'≥ ':'')+nf(v,0));
 const cv=$('legend'),x=cv.getContext('2d'),g=x.createLinearGradient(0,0,cv.width,0);[0,.25,.5,.75,1].forEach(f=>g.addColorStop(f,dataColor(colorRange(m).log?Math.expm1(f*Math.log1p(colorRange(m).max-colorRange(m).min))+colorRange(m).min:colorRange(m).min+f*(colorRange(m).max-colorRange(m).min),m).getStyle()));x.fillStyle=g;x.fillRect(0,0,cv.width,cv.height);
 configureTimeline();updateSelectedMarker();refreshBaseStyle();refreshLocationInsight();configureClimateFilters(m);
}
const mkWrap=$('markers'),tmpV=new THREE.Vector3(),MK={};
const MKL={amazonia:[1,40],pantanal:[1,30],sul:[1,30],nordeste:[0,30],cerrado:[0,40],sudeste:[0,30]};
RKEYS.forEach(k=>{const R=REG[k];R.pos=setFromLatLon(new THREE.Vector3(),R.lat,R.lon,1.013);const el=document.createElement('div');el.className='mk'+(MKL[k][0]?' left':'');el.style.setProperty('--c',R.c);el.style.setProperty('--w',MKL[k][1]+'px');el.style.setProperty('--dy',({nordeste:-16,cerrado:4,sudeste:26,amazonia:-6,pantanal:2,sul:8})[k]+'px');el.innerHTML='<div class="pt"></div><div class="ln"></div><div class="tg"><b></b><small></small></div>';el.onclick=e=>{e.stopPropagation();setRegion(k);};mkWrap.appendChild(el);MK[k]=el;});
function updateMarkers(text){
 const r=host.getBoundingClientRect(),cd=camera.position.clone().normalize(),lim=1/camera.position.length()+.05;
 RKEYS.forEach(k=>{const el=MK[k],R=REG[k],cell=dataMode==='files'&&VAR==='PREC'?activeMetric().regions[k]:null;if(cell)setFromLatLon(R.pos,cell.lat,cell.lon,1.013);tmpV.copy(R.pos).project(camera);el.style.left=`${(tmpV.x*.5+.5)*r.width}px`;el.style.top=`${(-tmpV.y*.5+.5)*r.height}px`;el.classList.toggle('hidden',(VIEW!=='class'||dataMode!=='files'||VAR!=='PREC')||R.pos.clone().normalize().dot(cd)<lim);el.classList.toggle('sel',k===region);if(text&&cell){el.querySelector('b').textContent=nf(cell.value)+' '+vunit(activeMetric());el.querySelector('small').textContent=rname(k);}});
}
let fly=null;host.addEventListener('eva:resize',()=>{fly=null;});
function flyTo(lat,lon,dist,dur=850){if(reducedMotion.matches){setFromLatLon(camera.position,lat,lon,dist??HOME_D);camera.lookAt(0,0,0);fly=null;return;}const from=camera.position.clone();fly={t0:performance.now(),dur,fromDir:from.clone().normalize(),toDir:setFromLatLon(new THREE.Vector3(),lat,lon,1).normalize(),fd:from.length(),td:dist??HOME_D};}
function stepFly(now){if(!fly)return;const k=Math.min(1,(now-fly.t0)/fly.dur),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;const q=new THREE.Quaternion().setFromUnitVectors(fly.fromDir,fly.toDir),qi=new THREE.Quaternion().slerp(q,e);camera.position.copy(fly.fromDir.clone().applyQuaternion(qi).multiplyScalar(fly.fd+(fly.td-fly.fd)*e));camera.lookAt(0,0,0);if(k>=1)fly=null;}
function flyRegion(){if(dataMode==='history'){flyTo(historySite.latitude,historySite.longitude,Math.max(1.8,HOME_D*.66));return;}if(selectedObservation){flyTo(selectedObservation.lat,selectedObservation.lon,Math.max(1.8,HOME_D*.66));return;}if(VAR==='PREC'){const R=REG[region];flyTo(region==='brasil'?15:R.lat,region==='brasil'?20:R.lon,region==='brasil'?HOME_D:HOME_D*.8);}else{const p=activeMetric().points[Math.floor(activeMetric().points.length/2)];flyTo(p[1],p[0],HOME_D);}}
function setRegion(k){if(!REG[k]||VAR!=='PREC')return;region=k;selectedObservation=null;flyRegion();if(VIEW==='monitor')render();else{updateGlobe();updateMarkers(true);}}
function setVar(v){climateFilter='all';stopPlay();historyRequest++;historyLoading=false;hideLocationInsight();if(v==='OZONE')return showFile('PREC');dataMode='history';VAR=v;region='brasil';selectedObservation=null;hist.length=0;render();animateMonitorPanels();setEvaMood('curious');}
function setYear(y){
 if(dataMode!=='history')return;year=Math.max(HISTORY.start,Math.min(HISTORY.end,Math.round(y)));updateGlobe();updateMarkers(true);
 // Keep the range control and WebGL canvas attached while scrubbing, preserving pointer capture.
 if(VIEW==='monitor'){
  const big=document.querySelector('.mcard .big');if(big)big.innerHTML=nf(activeValue())+'<small>'+activeMetric().unit+'</small>';
  const label=document.querySelector('.mcard .kh .lbl:last-child');if(label)label.textContent=year;
  if($('insightTxt'))$('insightTxt').innerHTML=historyInsight();
  const insightYear=document.querySelector('.insight h4 i');if(insightYear)insightYear.textContent=year;
  drawHistoryChart('cMain');
 }
}
const camLL=()=>{const p=camera.position.clone().normalize();return [THREE.MathUtils.radToDeg(Math.asin(p.y)),THREE.MathUtils.radToDeg(Math.atan2(-p.z,p.x))];};
$('zin').onclick=()=>flyTo(...camLL(),Math.max(1.5,camera.position.length()*.78),450);$('zout').onclick=()=>flyTo(...camLL(),Math.min(8,camera.position.length()*1.28),450);
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
renderer.domElement.addEventListener('pointerdown',e=>{downAt=e.isPrimary===false?null:[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointercancel',()=>{downAt=null;});
renderer.domElement.addEventListener('pointerup',e=>{if(!downAt)return;const mv=Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1]);downAt=null;if(mv>5)return;const r=host.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(earth)[0];if(!hit)return;const p=hit.point.clone().normalize(),lat=THREE.MathUtils.radToDeg(Math.asin(p.y)),lon=THREE.MathUtils.radToDeg(Math.atan2(-p.z,p.x));
 stopPlay();
 if(focusCountryAt(lat,lon))return;
 if(dataMode==='history'){const anchor=HISTORY.sites.find(s=>angularDistance(lat,lon,s.latitude,s.longitude)<1);if(anchor)focusHistorySite(anchor.id);else focusClickedLocation(lat,lon);return;}
 const best=nearestObservation(activeMetric().points,lat,lon,4);if(!best){showLocationNotice(tx('Este arquivo não tem uma medição próxima daqui. Escolha um dos pontos coloridos ou explore o histórico de temperatura e chuva.','This file has no nearby measurement here. Choose a colored point or explore temperature and rainfall history.'));setEvaMood('curious');return;}
 selectedObservation={lon:best[0],lat:best[1],value:best[2]};region='brasil';if(VIEW==='monitor')render();flyRegion();showLocationInsight();setEvaMood('investigative');});
// This control switches dated snapshots, never fabricates a time series.
(function ticks(){[tx('jan · AIRS','Jan · AIRS'),tx('set · MERRA-2','Sep · MERRA-2'),tx('nov · O₃','Nov · O₃')].forEach((v,i)=>{const s=document.createElement('span');s.className='tk';s.style.left=(i*50)+'%';s.textContent=v;$('trk').appendChild(s);});})();
let playing=false,lastStep=0;
$('slider').oninput=e=>{stopPlay();setYear(+e.target.value);};
function startPlay(){if(dataMode!=='history')return;playing=true;lastStep=performance.now();$('playIcon').innerHTML='<path d="M2 1h3v10H2zM7 1h3v10H7z"/>';}
function stopPlay(){playing=false;$('playIcon').innerHTML='<path d="M2 1l9 5-9 5z"/>';}
$('play').onclick=()=>playing?stopPlay():startPlay();
function stepPlay(now){if(!playing||document.hidden||now-lastStep<900)return;lastStep=now;setYear(year>=HISTORY.end?HISTORY.start:year+1);}
function render(){
 document.querySelectorAll('.nav[data-v]').forEach(n=>n.classList.toggle('on',n.dataset.v===VIEW));$('crumb').textContent=VIEW==='monitor'?'Climate Monitor':'Live Class';Object.keys(CH).forEach(k=>delete CH[k]);const st=$('stage');document.body.appendChild(st);const V=$('view');$('stage').dataset.mode=dataMode;V.className=VIEW==='monitor'?'mon':'cls';V.innerHTML=VIEW==='monitor'?viewMonitor():viewClass();$('slotGlobe').appendChild(st);document.body.classList.toggle('cls-on',VIEW==='class');document.body.classList.toggle('stu',ROLE==='student');document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));if(VIEW==='monitor')monitorAfter();else classAfter();GLOBE_OFFX=0;resize();updateGlobe();updateMarkers(true);
}
function setView(v){if(v===VIEW)return;stopPlay();VIEW=v;render();}
document.querySelectorAll('.nav[data-v]').forEach(n=>n.onclick=()=>setView(n.dataset.v));document.querySelectorAll('.role button').forEach(b=>b.onclick=()=>setRole(b.dataset.r));
function setRole(r){ROLE=r;document.querySelectorAll('.role button').forEach(x=>x.classList.toggle('on',x.dataset.r===r));render();}
const ro=new ResizeObserver(()=>{resize();if($('cMain'))drawChart('cMain');});ro.observe(host);
function loop(now){requestAnimationFrame(loop);stepFly(now);stepCountrySurface(now);if(!fly)controls.update();stepPlay(now);if(cloudTransition){const f=Math.min(1,(now-cloudTransition.start)/300),a=pointGeometry.getAttribute('color');for(let i=0;i<a.array.length;i++)a.array[i]=cloudTransition.from[i]+(cloudTransition.to[i]-cloudTransition.from[i])*f;a.needsUpdate=true;if(f===1)cloudTransition=null;}overlayMat.uniforms.uTime.value=now/1000;const d=camera.position.length();halo.scale.setScalar(2*1.3*d/Math.sqrt(d*d-1));updateMarkers(false);updateSelectedMarker();updateEvaConnection(now);renderer.render(scene,camera);}
