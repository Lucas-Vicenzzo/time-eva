import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id);
// Derived only from the challenge files; dates, QC filters and hashes are embedded at build time.
const EVIDENCE=/*__EVIDENCE__*/;
const HISTORY=/*__HISTORY__*/;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let LANG='pt';
try{LANG=localStorage.getItem('eva-language')==='en'?'en':'pt';}catch{}
const tx=(pt,en)=>LANG==='pt'?pt:en;
const nf=(v,d=1)=>v==null?'—':new Intl.NumberFormat(LANG==='pt'?'pt-BR':'en-US',{maximumFractionDigits:d}).format(v);
const fmtn=(v,d=1)=>nf(v,d);
const REG={
 brasil:{name:'Global grid',short:'Global',lat:-12,lon:-52,c:'#182230'},
 amazonia:{name:'Amazon',short:'Amazon',lat:-4.5,lon:-60,c:'#82C610'},
 cerrado:{name:'Cerrado',short:'Cerrado',lat:-15,lon:-47.5,c:'#F5C518'},
 nordeste:{name:'Northeast',short:'Northeast',lat:-7.5,lon:-39,c:'#FFAE38'},
 pantanal:{name:'Pantanal',short:'Pantanal',lat:-17.8,lon:-56.7,c:'#0bc5c5'},
 sudeste:{name:'Southeast',short:'Southeast',lat:-22,lon:-44.6,c:'#7a5af8'},
 sul:{name:'South',short:'South',lat:-28.4,lon:-51.4,c:'#309CEC'},
};
const RKEYS=['amazonia','cerrado','nordeste','pantanal','sudeste','sul'];
const rname=k=>({brasil:tx('Grade global','Global grid'),amazonia:tx('Amazônia','Amazon'),cerrado:'Cerrado',nordeste:tx('Nordeste','Northeast'),pantanal:'Pantanal',sudeste:tx('Sudeste','Southeast'),sul:tx('Sul','South')})[k];
const P0=0,P1=2;
const datasetFor=v=>EVIDENCE.datasets.find(d=>d.id===({T2M:'airs',PREC:'merra2',OZONE:'sentinel5p'}[v]));
const metricFor=(v,merraMetric='RX1Day')=>datasetFor(v).metrics[v==='T2M'?'TSurfAir':v==='OZONE'?'ozone':merraMetric];
const vunit=m=>m.unit==='days'?tx('dias','days'):m.unit;

function observationDate(variable=VAR){
 const period=datasetFor(variable).period;
 const start=period.split(' / ')[0];
 return new Intl.DateTimeFormat(LANG==='pt'?'pt-BR':'en-US',{day:datasetFor(variable).id==='merra2'?undefined:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(start));
}
function historyTicks(){
 const ticks=[HISTORY.start];
 for(let y=Math.ceil((HISTORY.start+1)/10)*10;y<HISTORY.end;y+=10)ticks.push(y);
 if(HISTORY.end!==HISTORY.start)ticks.push(HISTORY.end);
 return ticks;
}
