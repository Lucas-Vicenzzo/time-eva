/* Country colors summarize available samples, never claim national coverage. */
const mappedCountries=topojson.feature(ctopo,ctopo.objects.countries).features.map(prepareCountry);
const countryLookups=new Map();let countryPaintKey='',countryGroups=[],surfaceFade=null;
const countrySurfaceGeometry=new THREE.SphereGeometry(1.004,128,96);
const countrySurfaces=[0,1].map(i=>{const mesh=new THREE.Mesh(countrySurfaceGeometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,toneMapped:false}));mesh.renderOrder=3+i;scene.add(mesh);return mesh;});
let activeCountrySurface=0,countryColorsOn=true,measurementPointsOn=false;
function paintCountrySurface(m,key){
 if(key===countryPaintKey)return;countryPaintKey=key;
 const source=activeMetric(),lookupKey=dataMode+'|'+VAR+'|'+merraMetric+'|'+(dataMode==='history'?historySite.latitude+','+historySite.longitude+'|'+year:'');
 let lookup=countryLookups.get(lookupKey);if(!lookup){lookup=source.points.map(p=>countryAt(p[0],p[1],mappedCountries));if(countryLookups.size>48)countryLookups.clear();countryLookups.set(lookupKey,lookup);}
 countryGroups=countrySampleGroups(source.points,m.colorValues||source.points.map(p=>p[2]),mappedCountries,lookup);
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;const ctx=canvas.getContext('2d');
 // Neutral countries communicate missing coverage while retaining the satellite coastline.
 for(const country of mappedCountries){ctx.beginPath();ringsOf(country.feature).forEach(r=>traceRing(ctx,r,2048,1024,true));ctx.fillStyle='rgba(185,199,210,.22)';ctx.fill('evenodd');}
 for(const group of countryGroups){ctx.beginPath();ringsOf(group.country.feature).forEach(r=>traceRing(ctx,r,2048,1024,true));ctx.fillStyle=dataColor(group.value,m).getStyle();ctx.fill('evenodd');}
 ctx.beginPath();ringsOf(borders).forEach(r=>traceRing(ctx,r,2048,1024,false));ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.1;ctx.stroke();
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 const from=countrySurfaces[activeCountrySurface];activeCountrySurface=1-activeCountrySurface;const to=countrySurfaces[activeCountrySurface];to.material.map?.dispose();to.material.map=texture;to.material.needsUpdate=true;
 const target=countryColorsOn ? .78 : 0;surfaceFade={start:performance.now(),from,to,fromOpacity:from.material.opacity,target};
 if(reducedMotion.matches){from.material.opacity=0;to.material.opacity=target;surfaceFade=null;}
}
function stepCountrySurface(now){if(!surfaceFade)return;const t=Math.min(1,(now-surfaceFade.start)/450),e=1-Math.pow(1-t,3);surfaceFade.from.material.opacity=surfaceFade.fromOpacity*(1-e);surfaceFade.to.material.opacity=surfaceFade.target*e;if(t===1)surfaceFade=null;}
function updateVisualLayers(){
 observationCloud.visible=measurementPointsOn;observationOutline.visible=measurementPointsOn;
 if(surfaceFade)surfaceFade.target=countryColorsOn ? .78 : 0;
 else countrySurfaces.forEach((mesh,i)=>mesh.material.opacity=i===activeCountrySurface&&countryColorsOn ? .78 : 0);
}
function focusCountryAt(lat,lon){
 if(!countryColorsOn)return false;
 const country=countryAt(lon,lat,mappedCountries),group=countryGroups.find(g=>g.country===country);if(!group)return false;
 const nearest=group.points.reduce((best,p)=>angularDistance(lat,lon,p[1],p[0])<angularDistance(lat,lon,best[1],best[0])?p:best);
 if(dataMode==='files'){selectedObservation={lon:nearest[0],lat:nearest[1],value:nearest[2]};region='brasil';render();flyRegion();showLocationInsight();setEvaMood('investigative');return true;}
 const site=activeMetric().sites.find(s=>s.longitude===nearest[0]&&s.latitude===nearest[1]);if(!site)return false;
 if(site.id)focusHistorySite(site.id);else{historySite=site;render();flyRegion();showLocationInsight();}return true;
}
let panelAnimations=[];
function animateMonitorPanels(){
 if(reducedMotion.matches)return;panelAnimations.forEach(a=>a.cancel());panelAnimations=[];
 document.querySelectorAll('#view>.lcol .mcard,#view>.rcol').forEach(el=>{if(el.animate)panelAnimations.push(el.animate([{opacity:.35,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'}));});
}
const countryHover=document.createElement('div');countryHover.className='country-hover';countryHover.hidden=true;countryHover.setAttribute('aria-hidden','true');$('stage').appendChild(countryHover);
let hoverTime=0;
renderer.domElement.addEventListener('pointermove',e=>{
 if(downAt||!countryColorsOn||performance.now()-hoverTime<65){if(downAt)countryHover.hidden=true;return;}hoverTime=performance.now();
 const bounds=host.getBoundingClientRect();mouse.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(earth)[0];if(!hit){countryHover.hidden=true;return;}
 const pos=hit.point.clone().normalize(),lat=THREE.MathUtils.radToDeg(Math.asin(pos.y)),lon=THREE.MathUtils.radToDeg(Math.atan2(-pos.z,pos.x));const country=countryAt(lon,lat,mappedCountries);if(!country){countryHover.hidden=true;return;}
 const group=countryGroups.find(g=>g.country===country),m=globeMetric(activeMetric());
 countryHover.textContent=country.feature.properties.name+' · '+(group?nf(group.value)+' '+(m.trendMode?m.unit+'/'+tx('década','decade'):vunit(m))+' · '+group.count+' '+tx('amostras','samples'):tx('Sem amostras neste recorte','No samples in this view'));
 countryHover.style.left=Math.max(8,Math.min(bounds.width-228,e.clientX-bounds.left+14))+'px';countryHover.style.top=Math.min(bounds.height-55,e.clientY-bounds.top+16)+'px';countryHover.hidden=false;
});
renderer.domElement.addEventListener('pointerleave',()=>countryHover.hidden=true);
renderer.domElement.addEventListener('pointerdown',()=>countryHover.hidden=true);
