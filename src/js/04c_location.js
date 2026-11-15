/* A selected observation stays distinct from the satellite background. */
let locationInsightVisible=false,locationNotice='',locationQuery=0;
function hideLocationInsight(){locationQuery++;locationInsightVisible=false;locationNotice='';document.querySelector('.insight')?.classList.remove('location-active');if($('evaConnection'))$('evaConnection').style.display='none';}
function refreshLocationInsight(){
 if(!locationInsightVisible||VIEW!=='monitor')return;
 const text=$('insightTxt');if(!text)return;
 const pending=historyLoading&&dataMode==='history';
 text.setAttribute('role','status');text.setAttribute('aria-live','polite');
 text.innerHTML=locationNotice||(pending?tx('Consultando o histórico da NASA para o ponto escolhido…','Checking NASA history for the selected point…'):dataMode==='history'?historyInsight():insightHTML());
 document.querySelector('.insight')?.classList.add('location-active');
}
function showLocationInsight(){if(dataMode==='files'&&!selectedObservation){showLocationNotice(tx('Escolha um ponto colorido para investigar a medição desse local.','Choose a colored point to investigate its measurement.'));return;}locationNotice='';locationInsightVisible=true;refreshLocationInsight();animateEvaConnection();}
function showLocationNotice(text){locationNotice=text;locationInsightVisible=true;refreshLocationInsight();}
function animateEvaConnection(){
 let svg=$('evaConnection');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='evaConnection';svg.setAttribute('aria-hidden','true');svg.innerHTML='<path class="eva-connection-under"/><path class="eva-connection-line" pathLength="1"/><circle class="eva-node eva-node-start" r="5"/><circle class="eva-node eva-node-end" r="7"/>';document.body.appendChild(svg);}
 const path=svg.querySelector('.eva-connection-line');path.classList.remove('draw');requestAnimationFrame(()=>path.classList.add('draw'));
}
let lastConnectionFrame=0;
function updateEvaConnection(now){
 if(now-lastConnectionFrame<40)return;lastConnectionFrame=now;
 const svg=$('evaConnection');if(!svg)return;
 const bubble=document.querySelector('.insight .bub');
 if(!locationInsightVisible||locationNotice||historyLoading||VIEW!=='monitor'||!bubble||selectionMarker.classList.contains('hidden')||evaOpen()){svg.style.display='none';return;}
 const end=bubble.getBoundingClientRect(),start=host.getBoundingClientRect(),x=start.left+parseFloat(selectionMarker.style.left),y=start.top+parseFloat(selectionMarker.style.top);
 if(!end.width||end.bottom<0||end.top>innerHeight||x<0||x>innerWidth||y<0||y>innerHeight){svg.style.display='none';return;}
 const targetX=end.left>start.right-30?end.left-6:end.left+end.width/2,targetY=end.left>start.right-30?end.top+Math.min(end.height/2,70):end.top-6;
 svg.style.display='block';svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 const curve=`M ${x+10} ${y} C ${x+80} ${y-50}, ${targetX-60} ${targetY-30}, ${targetX} ${targetY}`;svg.querySelectorAll('path').forEach(path=>path.setAttribute('d',curve));const first=svg.querySelector('.eva-node-start'),last=svg.querySelector('.eva-node-end');first.setAttribute('cx',x+10);first.setAttribute('cy',y);last.setAttribute('cx',targetX);last.setAttribute('cy',targetY);
}
async function focusClickedLocation(lat,lon){
 const request=++locationQuery;showLocationInsight();
 const loading=loadHistoryLocation(lat,lon),historyToken=historyRequest;flyTo(lat,lon,Math.max(1.8,HOME_D*.66));
 const site=await loading;if(request!==locationQuery||historyToken!==historyRequest||dataMode!=='history')return;
 if(site){showLocationInsight();setEvaMood('investigative');}
 else if(!historyLoading)showLocationNotice(tx('Não consegui consultar esse ponto agora. O gráfico mantém o local anterior. Tente novamente ou escolha uma amostra em “Explorar o mundo”.','I couldn’t load this point. The chart retains the previous location. Try again or choose a sample in “Explore the world”.'));
}
