/* Shared navigation curtain: continuous across documents, released by the demo's real ready signal. */
(()=>{
 const root=document.documentElement,isDemo=/^\/demo(?:\/|$)/.test(location.pathname),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const storageKey='eva-demo-start';let starting=false,finished=false,timer,recoveryTimer;
 const readStart=()=>{try{const value=Number(sessionStorage.getItem(storageKey));return value>0&&Date.now()-value<30000?value:Date.now();}catch{return Date.now();}};
 let started=isDemo?readStart():0;
 if(isDemo)root.classList.add('demo-booting');
 function prepare(){
  let english=false;try{english=localStorage.getItem('eva-language')==='en';}catch{}
  const title=document.getElementById('demoLoadingTitle'),message=document.getElementById('demoLoadingMessage'),panel=document.getElementById('demoLoading');if(!panel)return;
  panel.setAttribute('aria-label',english?'Preparing the demo':'Preparando a demo');panel.querySelector('img').alt=english?'EVA investigating with a magnifying glass':'EVA investigando com uma lupa';
  title.textContent=english?'Ready to investigate our planet?':'Vamos investigar o planeta?';message.textContent=english?'Preparing the globe and the demo data.':'Preparando o globo e os dados da demo.';
  document.getElementById('demoLoadingRetry').textContent=english?'Try again':'Tentar novamente';document.getElementById('demoLoadingBack').textContent=english?'Back to home':'Voltar ao início';
  document.getElementById('demoLoadingRetry').onclick=()=>location.reload();
  document.querySelectorAll('body>main,body>nav,body>footer,#app,#eva,#intro,#peek').forEach(el=>el.inert=root.classList.contains('demo-booting'));
  clearTimeout(recoveryTimer);if(root.classList.contains('demo-booting'))recoveryTimer=setTimeout(()=>{if(finished)return;message.textContent=english?'This is taking a little longer. You can try again or return home.':'Está levando um pouco mais de tempo. Você pode tentar novamente ou voltar ao início.';document.getElementById('demoLoadingRecovery').hidden=false;},12000);
 }
 window.evaDemoReady=()=>{
  if(!isDemo||finished)return;finished=true;clearTimeout(recoveryTimer);
  // A short readable moment, without a fixed wait when actual loading already took longer.
  timer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
   root.classList.add('demo-revealing');setTimeout(()=>{root.classList.remove('demo-booting','demo-revealing');document.querySelectorAll('#app,#eva,#intro,#peek').forEach(el=>el.inert=false);try{sessionStorage.removeItem(storageKey);}catch{}},reduced?0:280);
  })),Math.max(0,(reduced?350:1100)-(Date.now()-started)));
 };
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link||isDemo||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href,location.href);if(url.origin!==location.origin||!/^\/demo(?:\/|$)/.test(url.pathname))return;
  event.preventDefault();if(starting)return;starting=true;started=Date.now();try{sessionStorage.setItem(storageKey,String(started));}catch{}
  const panel=document.getElementById('demoLoading');panel.style.display='flex';panel.getBoundingClientRect();
  requestAnimationFrame(()=>{root.classList.add('demo-booting');prepare();timer=setTimeout(()=>location.assign(url.href),reduced?0:260);});
 });
 document.addEventListener('DOMContentLoaded',()=>{prepare();if(isDemo&&window.__EVADENCE_OK)window.evaDemoReady();});
 addEventListener('pageshow',event=>{if(!isDemo&&event.persisted){clearTimeout(timer);clearTimeout(recoveryTimer);starting=false;document.getElementById('demoLoading').style.display='';root.classList.remove('demo-booting','demo-revealing');document.querySelectorAll('body>main,body>nav,body>footer').forEach(el=>el.inert=false);}});
})();
