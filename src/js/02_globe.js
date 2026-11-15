
/* =========================== GLOBO =========================== */
const land = topojson.feature(JSON.parse($('land-data').textContent), 'land');
const ctopo = JSON.parse($('countries-data').textContent);
const borders = topojson.mesh(ctopo, ctopo.objects.countries, (a,b)=>a!==b);
const brazil = topojson.feature(ctopo, ctopo.objects.countries).features.find(f=>String(f.id)==='076');
function ringsOf(geom){ const out=[]; const g=geom.type==='Feature'?geom.geometry:geom;
  const push=p=>p.forEach(r=>out.push(r));
  if(g.type==='Polygon') push(g.coordinates); else if(g.type==='MultiPolygon') g.coordinates.forEach(push);
  else if(g.type==='LineString') out.push(g.coordinates); else if(g.type==='MultiLineString') g.coordinates.forEach(l=>out.push(l));
  else if(g.type==='FeatureCollection') g.features.forEach(f=>out.push(...ringsOf(f))); return out; }

function traceRing(ctx, ring, W, H, close){
  // desembrulha longitudes para evitar riscos atravessando o mapa
  let prev=null, off=0; const pts=[];
  for(const [lo,la] of ring){ let L=lo+off; if(prev!==null){ if(L-prev>180){off-=360;L-=360;} else if(L-prev<-180){off+=360;L+=360;} } prev=L; pts.push([L,la]); }
  const minL=Math.min(...pts.map(p=>p[0])), maxL=Math.max(...pts.map(p=>p[0]));
  const shifts=[0]; if(minL<-180) shifts.push(360); if(maxL>180) shifts.push(-360);
  for(const s of shifts){ ctx.moveTo((pts[0][0]+s+180)/360*W,(90-pts[0][1])/180*H);
    for(let i=1;i<pts.length;i++) ctx.lineTo((pts[i][0]+s+180)/360*W,(90-pts[i][1])/180*H);
    if(close) ctx.closePath(); }
}
const host=$('globe');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.setClearColor(0x000000,0);
host.appendChild(renderer.domElement);
function makeEarthTexture(){
  const W=Math.min(renderer.capabilities.maxTextureSize,Math.min(screen.width,screen.height)>500?4096:2048),H=W/2,S=W/4096, c=document.createElement('canvas'); c.width=W;c.height=H; const x=c.getContext('2d');
  x.fillStyle='#2489be'; x.fillRect(0,0,W,H);
  // terra em matriz de pontos (estilo técnico)
  x.save(); x.beginPath(); ringsOf(land).forEach(r=>traceRing(x,r,W,H,true)); x.clip('evenodd');
  x.fillStyle='#83bb74'; x.fillRect(0,0,W,H);
  const step=10*S, rad=2.1*S; x.fillStyle='rgba(82,96,113,.26)';
  for(let py=step/2;py<H;py+=step){ const lat=90-py/H*180, k=1/Math.max(.2,Math.cos(lat*Math.PI/180)); for(let px=step/2;px<W;px+=step*k){ x.beginPath(); x.arc(px,py,rad,0,7); x.fill(); } }
  x.restore();
  // graticule
  x.lineWidth=S; x.strokeStyle='rgba(48,156,236,.08)';
  for(let lo=-180;lo<=180;lo+=15){const px=(lo+180)/360*W;x.beginPath();x.moveTo(px,0);x.lineTo(px,H);x.stroke();}
  for(let la=-75;la<=75;la+=15){const py=(90-la)/180*H;x.beginPath();x.moveTo(0,py);x.lineTo(W,py);x.stroke();}
  x.lineWidth=1.4*S; x.strokeStyle='rgba(82,96,113,.22)'; x.beginPath(); ringsOf(land).forEach(r=>traceRing(x,r,W,H,true)); x.stroke();
  x.lineWidth=S; x.strokeStyle='rgba(82,96,113,.12)'; x.beginPath(); ringsOf(borders).forEach(r=>traceRing(x,r,W,H,false)); x.stroke();
  // All countries share the same boundary treatment; exploration is global.
  return c;
}
function makeMask(feature,blur=3){ const W=2048,H=1024,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  x.fillStyle='#000';x.fillRect(0,0,W,H);x.fillStyle='#fff';x.beginPath();ringsOf(feature).forEach(r=>traceRing(x,r,W,H,true));x.fill('evenodd');if(blur){x.filter=`blur(${blur}px)`;x.drawImage(c,0,0);}return c; }

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,1,.01,200);
function setFromLatLon(v,lat,lon,r=1){const a=THREE.MathUtils.degToRad(lat),b=THREE.MathUtils.degToRad(lon);return v.set(r*Math.cos(a)*Math.cos(b),r*Math.sin(a),-r*Math.cos(a)*Math.sin(b));}
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.07; controls.enablePan=false; controls.rotateSpeed=.45; controls.zoomSpeed=.6; controls.minDistance=1.5; controls.maxDistance=8;
let HOME_D=4.2, GLOBE_OFFX=0;
function fitDistance(){ const r=host.getBoundingClientRect(), fill=.82, vf=THREE.MathUtils.degToRad(camera.fov/2), hf=Math.atan(Math.tan(vf)*camera.aspect);
  const ang=Math.atan(fill*Math.tan(Math.min(vf,hf))); return 1/Math.sin(ang); }
let lastViewportWidth=0,lastViewportHeight=0;
function resize(){ const r=host.getBoundingClientRect(); if(!r.width||!r.height) return; const changed=Math.abs(r.width-lastViewportWidth)>1||Math.abs(r.height-lastViewportHeight)>1;lastViewportWidth=r.width;lastViewportHeight=r.height;renderer.setSize(r.width,r.height); camera.aspect=r.width/r.height;
  camera.clearViewOffset();camera.updateProjectionMatrix();HOME_D=fitDistance();controls.maxDistance=Math.max(8,HOME_D*2);if(changed&&camera.position.length()>0){camera.position.setLength(HOME_D);host.dispatchEvent(new Event('eva:resize'));} }
resize(); setFromLatLon(camera.position,-12,-50,HOME_D);

const earthTex=new THREE.CanvasTexture(makeEarthTexture()); earthTex.colorSpace=THREE.SRGBColorSpace; earthTex.anisotropy=renderer.capabilities.getMaxAnisotropy();
const landMask=makeMask(land), maskTex=new THREE.CanvasTexture(landMask);
const brTex=new THREE.CanvasTexture(makeMask(brazil,2));
const specCanvas=(()=>{const c=document.createElement('canvas');c.width=landMask.width;c.height=landMask.height;const x=c.getContext('2d');x.filter='invert(1)';x.drawImage(landMask,0,0);return c;})();
const earth=new THREE.Mesh(new THREE.SphereGeometry(1,128,96),new THREE.MeshPhongMaterial({map:earthTex,specularMap:new THREE.CanvasTexture(specCanvas),specular:new THREE.Color('#0d1520'),shininess:8}));
scene.add(earth);
// The satellite composite is a geographic base, independent of the observation year.
let baseStyle='satellite',satelliteTexture=null,satelliteFailed=false;
const satelliteSource='https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/';
function refreshBaseStyle(){
 earth.material.map=baseStyle==='satellite'&&satelliteTexture?satelliteTexture:earthTex;earth.material.needsUpdate=true;
 const toggle=$('baseStyle');if(toggle){toggle.textContent=tx('Satélite','Satellite');toggle.setAttribute('aria-pressed',String(baseStyle==='satellite'));toggle.disabled=satelliteFailed;}
 const credit=$('satelliteCredit');if(credit){credit.href=satelliteSource;credit.textContent=baseStyle==='satellite'?(satelliteFailed?tx('Imagem indisponível · mapa ilustrado','Image unavailable · illustrated map'):satelliteTexture?tx('NASA Blue Marble · 2001/2002 · imagem fixa','NASA Blue Marble · 2001/2002 · fixed image'):tx('Carregando imagem NASA…','Loading NASA imagery…')):tx('Mapa ilustrado · dados nas cores dos pontos','Illustrated map · point colors show data');}
}
new THREE.TextureLoader().load('/assets/nasa-blue-marble.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();satelliteTexture=texture;refreshBaseStyle();},undefined,()=>{satelliteFailed=true;baseStyle='illustrated';refreshBaseStyle();});
scene.add(new THREE.AmbientLight('#ffffff',2.1));
const sun=new THREE.DirectionalLight('#ffffff',.55); camera.add(sun); sun.position.set(-2,1.6,1.2); scene.add(camera);
