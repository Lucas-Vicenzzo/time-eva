const EVA_MOODS=['neutral','happy','curious','investigative','sad','thoughtful','bouncy','excited'];
let evaMood='neutral',moodReset;
const moodLabel=()=>({neutral:tx('Pronta para explorar','Ready to explore'),happy:tx('Que descoberta!','A new discovery!'),curious:tx('Vamos investigar?','Let’s investigate'),investigative:tx('De olho na evidência','Following the evidence'),sad:tx('Cuidar também é entender','Understanding helps us care'),thoughtful:tx('Conectando as ideias…','Connecting the ideas…'),bouncy:tx('Aprender move o mundo','Learning moves the world'),excited:tx('Você encontrou uma pista!','You found a clue!')})[evaMood];
function setEvaMood(mood,{resetAfter=0}={}){
 if(!EVA_MOODS.includes(mood))return;clearTimeout(moodReset);evaMood=mood;document.body.dataset.evaMood=mood;
 document.querySelectorAll('.mascot use,.evaSide svg use,.ehd svg use,.explain svg use').forEach(u=>u.setAttribute('href','#eva-'+mood));
 const mascot=$('mascot');if(mascot){mascot.setAttribute('role','button');mascot.setAttribute('tabindex','0');mascot.setAttribute('aria-label',tx('EVA: ','EVA: ')+moodLabel()+tx('. Ouvir um insight.','. Get an insight.'));mascot.onclick=()=>awarenessInsight();mascot.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();awarenessInsight();}};}
 if($('evaMoodLabel'))$('evaMoodLabel').textContent=moodLabel();
 if(resetAfter)moodReset=setTimeout(()=>setEvaMood('neutral'),resetAfter);
}
function awarenessInsight(){
 let text,mood='thoughtful';
 if(dataMode==='history'){
  const slope=seriesTrend(historySeries())*10;
  if(VAR==='T2M'){
   text=historyInsight()+' '+tx('Temperatura influencia conforto, consumo de energia e saúde. Observe a tendência junto das variações entre anos; um único local não representa o clima de todo o planeta. Que medidas de sombra e cuidado com a água sua escola pode adotar?','Temperature affects comfort, energy use and health. Consider the trend alongside year-to-year variation; a single location does not represent the whole planet. What shade and water-saving actions could your school take?');
   mood=slope>0?'sad':'thoughtful';
  }else{
   text=historyInsight()+' '+tx('A disponibilidade de água depende também da estação, do solo e do uso da terra. Uma média anual não diagnostica uma seca. Compare lugares e pense em como reduzir o desperdício de água.','Water availability also depends on season, soil and land use. An annual mean cannot diagnose drought. Compare locations and consider ways to reduce water waste.');mood=slope<0?'sad':'investigative';
  }
 }else{
  text=insightHTML()+' '+tx('Esta observação é uma pista, não a história completa. Investigar fonte, cobertura e contexto é o primeiro passo para cuidar melhor do planeta.','This observation is one clue, not the whole story. Checking source, coverage and context is a first step toward caring for our planet.');mood='investigative';
 }
 openEva(true);evaSay(text,{peek:false,speak:false});setEvaMood(mood);
}
// Pause authored nonessential motion when the document is not visible.
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('motion-paused',document.hidden));

function applyExplorationIntent(q){
 if(VIEW==='class'||!/^\s*(?:(?:me|por favor)\s+)?(?:mostre|mostrar|mude|vá|explore|show|change|go to|explore)\b/i.test(q))return;
 const lower=q.toLocaleLowerCase();const site=HISTORY.sites.find(s=>lower.includes(s.name.toLocaleLowerCase())||lower.includes(s.id.toLowerCase()));
 const yr=q.match(/\b(19[89]\d|20[012]\d)\b/);const annual=/temperatura|temperature|chuva|rainfall/i.test(q);
 const directive=/mostr|show|vá|go to|compare|compar|mude|change|explor/i.test(q);if(!site&&!yr&&!(annual&&directive))return;
 if(/temperatura|temperature/i.test(q)){dataMode='history';VAR='T2M';}else if(/chuva|rainfall/i.test(q)){dataMode='history';VAR='PREC';}
 if(site){dataMode='history';historySite=site;}
 if((q.match(/\b(?:19[89]\d|20[012]\d)\b/g)||[]).length===1&&yr&&+yr[1]>=HISTORY.start&&+yr[1]<=HISTORY.end&&dataMode==='history')year=+yr[1];
 render();if(site)flyRegion();setEvaMood('investigative');
}
