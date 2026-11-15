/* Filters classify measured points; they never interpolate entire countries. */
let climateFilter='all';
function matchesClimateFilter(filter,anomaly,trend){
 if(filter==='warming'||filter==='wetter')return Number.isFinite(trend)&&trend>0;
 if(filter==='cooling'||filter==='drier')return Number.isFinite(trend)&&trend<0;
 if(filter==='above')return Number.isFinite(anomaly)&&anomaly>0;
 if(filter==='below')return Number.isFinite(anomaly)&&anomaly<0;
 return true;
}
function globeMetric(m){
 if(dataMode!=='history')return m;
 const trendMode=['trend','warming','cooling','wetter','drier'].includes(climateFilter);
 const rows=m.points.map((point,i)=>{const trend=seriesTrend(m.sites[i].series[historyParameter()]);return{point,anomaly:m.colorValues[i],trend:trend===null?null:trend*10};});
 const visible=rows.filter(r=>matchesClimateFilter(climateFilter,r.anomaly,r.trend));
 return{...m,points:visible.map(r=>r.point),colorValues:visible.map(r=>trendMode?r.trend:climateFilter==='all'?r.point[2]:r.anomaly),isLevel:climateFilter==='all',totalPoints:rows.length,trendMode,
  visualRange:trendMode?{min:-1,max:1,log:false}:climateFilter==='all'?{min:VAR==='T2M'?-30:0,max:VAR==='T2M'?35:20,log:false}:null,
  visualLabel:trendMode?tx('Tendência ','Trend ')+HISTORY.start+'–'+HISTORY.end+' · '+m.unit+'/'+tx('década','decade'):climateFilter==='all'?tx('Nível anual · ','Annual level · ')+m.unit:null};
}
function toggleClimateFilter(filter){
 stopPlay();hideLocationInsight();climateFilter=climateFilter===filter?'all':filter;updateGlobe();setEvaMood('investigative');
}
function configureClimateFilters(m){
 let panel=$('climateFilters');if(!panel){
  panel=document.createElement('section');panel.id='climateFilters';panel.className='climate-filters';
  panel.innerHTML='<div class="layer-toggles" role="group"></div><div class="map-modes" role="group"></div><p id="climateFilterStatus" role="status" aria-live="polite"></p>';$('stage').appendChild(panel);
 }
 panel.hidden=VIEW!=='monitor';const layers=panel.querySelector('.layer-toggles'),modes=panel.querySelector('.map-modes');
 layers.setAttribute('aria-label',tx('Camadas visuais do globo','Globe visual layers'));modes.setAttribute('aria-label',tx('Significado das cores','Color meaning'));
 if(layers.dataset.lang!==LANG){layers.innerHTML=[['countries',tx('Cores dos países','Country colors')],['points',tx('Pontos de medição','Measurement points')]].map(([key,label])=>`<button type="button" data-layer="${key}" aria-pressed="false"><span class="filter-switch" aria-hidden="true"></span>${label}</button>`).join('');layers.dataset.lang=LANG;layers.querySelectorAll('button').forEach(button=>button.onclick=()=>{if(button.dataset.layer==='countries')countryColorsOn=!countryColorsOn;else measurementPointsOn=!measurementPointsOn;updateVisualLayers();configureClimateFilters(globeMetric(activeMetric()));});}
 layers.querySelector('[data-layer=countries]').setAttribute('aria-pressed',String(countryColorsOn));layers.querySelector('[data-layer=points]').setAttribute('aria-pressed',String(measurementPointsOn));
 const modeKey=LANG+'|'+dataMode;
 if(modes.dataset.key!==modeKey){modes.innerHTML=dataMode==='history'?`<button data-map-mode="all">${tx('Nível do ano','Annual level')}</button><button data-map-mode="trend">${tx('Evolução ','Trend ')+HISTORY.start+'–'+HISTORY.end}</button>`:'';modes.dataset.key=modeKey;modes.querySelectorAll('button').forEach(button=>button.onclick=()=>{climateFilter=button.dataset.mapMode;updateGlobe();});}
 modes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapMode===climateFilter)));
 $('climateFilterStatus').textContent=countryColorsOn?countryGroups.length+' '+tx('países com amostras. Cor = média das amostras disponíveis, não média nacional. Cinza = sem amostra.','countries with samples. Color = available sample mean, not a national mean. Gray = no sample.'):
 measurementPointsOn?tx('Pontos: locais realmente medidos. Toque para consultar.','Points: measured locations. Tap to inspect.'):tx('Imagem de satélite. Ative uma camada para visualizar os dados.','Satellite image. Enable a layer to see the data.');
}
