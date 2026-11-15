
// camada de impactos (shader): mar, gelo, Groenlândia, florestas, desertos, corais, queimadas, calor
const coastTex=new THREE.CanvasTexture((()=>{const m=makeMask(land,0),c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.filter='blur(5px)';x.drawImage(m,0,0,1024,512);return c;})());
const overlayMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uNear:{value:1},uAnom:{value:1.28},uMask:{value:maskTex},uCoast:{value:coastTex},uTemp:{value:0},uIce:{value:1},uIceLat:{value:79},uAntLat:{value:-63},uSeed:{value:0},uCo2:{value:0},uCo2Amt:{value:.5},uTime:{value:0},
    uSea:{value:0},uData:{value:1},uPal:{value:0},uVeil:{value:1},uImp:{value:0},uBR:{value:brTex},uR:{value:Array.from({length:6},()=>new THREE.Vector3())},uForest:{value:.82},uDesert:{value:0},uCoral:{value:.3},uFire:{value:.2},uGreen:{value:1},uScorch:{value:0}},
  vertexShader:`varying vec2 vUv; varying vec3 vN; void main(){vUv=uv; vN=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
  uniform float uNear,uAnom,uTemp,uIce,uIceLat,uAntLat,uSeed,uCo2,uCo2Amt,uTime,uSea,uForest,uDesert,uCoral,uFire,uGreen,uScorch;
  uniform sampler2D uMask,uCoast,uBR; uniform float uData,uPal,uVeil,uImp; uniform vec3 uR[6]; varying vec2 vUv; varying vec3 vN;
  float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
    return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}
  vec3 pal(float t){
    vec3 c0=vec3(.17,.36,1.),c1=vec3(.56,.77,1.),c2=vec3(1.,.84,.42),c3=vec3(1.,.54,.24),c4=vec3(.9,.14,.23),c5=vec3(.61,.1,.42);
    if(t<0.) return mix(c1,c0,clamp(-t/2.,0.,1.));
    if(t<1.) return mix(c2,c3,t); if(t<2.5) return mix(c3,c4,(t-1.)/1.5); return mix(c4,c5,clamp((t-2.5)/2.,0.,1.)); }
  vec3 tpal(float v){ v=clamp(v,-1.,1.); if(v<0.) return mix(vec3(.97,.98,1.),vec3(.23,.51,.96),-v); if(v<.35) return mix(vec3(1.,.97,.86),vec3(.99,.83,.3),v/.35); if(v<.7) return mix(vec3(.99,.83,.3),vec3(.98,.45,.09),(v-.35)/.35); return mix(vec3(.98,.45,.09),vec3(.86,.15,.15),(v-.7)/.3); }
  vec3 rpal(float v){ v=clamp(v,-1.,1.); return v<0.?mix(vec3(.98,.97,.94),vec3(.63,.38,.03),-v):mix(vec3(.96,.98,1.),vec3(.15,.39,.92),v); }
  vec3 spal(float v){ v=clamp(v,-1.,1.); return v<0.?mix(vec3(.98,.97,.94),vec3(.6,.34,.07),-v):mix(vec3(.95,.99,.95),vec3(.09,.6,.25),v); }
  vec2 LL; float reg(float la,float lo,float rla,float rlo){vec2 d=(LL-vec2(la,lo))/vec2(rla,rlo);return exp(-dot(d,d));}
  vec4 over(vec4 a,vec3 c,float al){ al=clamp(al,0.,1.); float na=al+a.a*(1.-al); return na<1e-4?a:vec4((c*al+a.rgb*a.a*(1.-al))/na,na); }
  void main(){
    float lat=(vUv.y-.5)*180.; float lon=vUv.x*360.-180.; LL=vec2(lat,lon); float sl=sin(radians(lat));
    float landv=texture2D(uMask,vUv).r; float land=smoothstep(.45,.55,landv);
    float coast=texture2D(uCoast,vUv).r;
    vec4 col=vec4(0.);
    float IMP=uImp;
    // 1. ressecamento e desertos avançando (faixa subtropical + Nordeste + Mediterrâneo)
    float belt=smoothstep(10.,17.,abs(lat))*(1.-smoothstep(33.,42.,abs(lat)));
    float dz=belt*smoothstep(.38,.62,fbm(vN*4.5))+reg(-8.,-40.,5.,5.)*.9+reg(39.,15.,5.,12.)*.6;
    float desert=clamp(dz*uDesert*1.7,0.,1.)*land*IMP;
    col=over(col,vec3(.87,.68,.4),desert*.75);
    col=over(col,vec3(.62,.45,.25),uScorch*.16*land*(1.-abs(sl)*.6)*IMP);
    // 2. florestas tropicais: verde saudável x área desmatada
    float rf=max(reg(-5.,-62.,10.,15.),max(reg(-1.,22.,6.,9.)*.8,reg(0.,113.,6.,9.)*.8))*land;
    float p=smoothstep(.3,.7,fbm(vN*16.+3.));
    float cut=smoothstep(uForest-.04,uForest+.04,p);
    vec3 green=mix(vec3(.1,.42,.14),vec3(.18,.62,.2),smoothstep(.85,.97,uForest));
    col=over(col,mix(green,vec3(.74,.58,.36),cut),rf*.9*IMP);
    // 3. Groenlândia: manto de gelo encolhendo
    float gd=length((LL-vec2(73.,-41.))/vec2(10.,22.));
    float gi=(1.-smoothstep(uGreen-.05,uGreen+.02,gd+(fbm(vN*9.)-.5)*.55))*land;
    col=over(col,vec3(.95,.98,1.),gi*.96);
    // 4. gelo marinho (Ártico e Antártida)
    if(uIce>.5){
      float e=(fbm(vN*9.)-.5)*3.;
      float north=smoothstep(uIceLat+e-.6,uIceLat+e+.6,lat)*(1.-land);
      float south=smoothstep(uAntLat-e+.8,uAntLat-e-.8,lat)*(1.-land);
      col=over(col,vec3(.93,.97,1.),max(north,south)*.95);
    }
    // 5. mar subindo: litorais baixos inundados (exagerado para ficar visível)
    float low=1.-smoothstep(.5,1.,coast);
    float hot=reg(23.,90.,3.,3.5)+reg(52.5,5.,1.6,3.)+reg(27.,-81.,3.,2.)+reg(31.,31.,1.6,1.8)+reg(10.,106.,2.5,2.5)+reg(30.,-91.,1.5,3.)+reg(31.5,121.5,1.6,1.6)+reg(-31.,-51.5,2.,1.6)+reg(0.,-50.,2.,2.)+reg(36.,-76.,2.,2.);
    float f=uSea*(.13+1.3*min(hot,1.));
    float fl=smoothstep(1.-f-.03,1.-f+.03,low+(fbm(vN*28.)-.5)*.16)*land*step(.002,uSea)*IMP;
    col=over(col,mix(vec3(.1,.42,.78),vec3(.25,.7,.95),.5+.5*sin(uTime*1.5+lon*.5)),fl*.92);
    // 6. recifes de coral: vivos (turquesa) x branqueados (branco)
    float reef=reg(-18.,147.,7.,2.5)+reg(18.,-77.,4.,9.)+reg(-2.,125.,6.,10.)+reg(22.,38.,6.,2.)+reg(4.,73.,4.,1.5)+reg(-20.,-40.,3.,2.)+reg(-12.,-38.,3.,1.5);
    float dots=step(.58,fbm(vN*70.))*smoothstep(.25,.6,reef)*(1.-land);
    col=over(col,mix(vec3(.15,.95,.8),vec3(1.),uCoral),dots*.95*IMP);
    // 7. queimadas: pontos que piscam
    float fz=reg(-9.,-55.,5.,10.)+reg(-18.,-57.,4.,4.)+reg(-33.,148.,5.,6.)+reg(38.,-121.,5.,5.)+reg(62.,120.,8.,25.)+reg(39.,18.,5.,15.)+reg(-5.,24.,6.,10.)+reg(55.,-115.,6.,15.)+reg(0.,112.,4.,8.);
    vec3 cell=floor(vN*110.); float r=h(cell+17.);
    vec3 lc=fract(vN*110.)-.5; float on=step(1.-uFire*min(fz,1.)*.5,r)*land*smoothstep(.32,.12,length(lc));
    float fl2=.55+.45*sin(uTime*(6.+r*8.)+r*40.);
    col=over(col,mix(vec3(1.,.35,.05),vec3(1.,.85,.3),fl2),on*fl2*IMP);
    // 8. dados NASA por região do Brasil (interpolação suave entre as 6 regiões)
    float br=texture2D(uBR,vUv).r;
    if(uVeil>0.) col=over(col,vec3(.96,.97,.99),uVeil*.45*land*(1.-br));
    if(uData>.5){ float ws=0.,vs=0.; for(int i=0;i<6;i++){ vec2 d=LL-uR[i].xy; float w=1./(dot(d,d)+6.); w*=w; ws+=w; vs+=w*uR[i].z; }
      float v=vs/ws; vec3 c=uPal<.5?tpal(v):uPal<1.5?rpal(v):spal(v); col=over(col,c,.86*br); }
    // 9. mapa de calor (opcional)
    if(uTemp>.5){
      float amp=.75+2.6*smoothstep(.55,.98,sl)+.3*smoothstep(.6,.95,-sl);
      amp*=mix(.8,1.35,landv); amp-=1.1*exp(-pow((lat-55.)/7.,2.)-pow((lon+35.)/14.,2.));
      float a=uAnom*amp+(fbm(vN*2.6+vec3(uSeed))-.5)*1.4*(.35+.25*abs(uAnom));
      col=over(col,pal(a),smoothstep(.15,1.4,abs(a))*.6*uNear);
    }
    // 9. CO₂ (opcional)
    if(uCo2>.5){ float sw=fbm(vN*3.+vec3(uTime*.03,0.,uTime*.02)); col=over(col,vec3(1.,.62,.2),uCo2Amt*(.25+.45*sw)*.8); }
    gl_FragColor=col;
  }`});
const overlay=new THREE.Mesh(new THREE.SphereGeometry(1.004,128,96),overlayMat); scene.add(overlay);
// halo suave da atmosfera (modo claro)
function haloCanvas(){const s=512,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);const e=1/1.3;
  g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(e-.02,'rgba(255,255,255,0)');g.addColorStop(e,'rgba(255,255,255,.9)');g.addColorStop(e+.05,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);return c;}
const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(haloCanvas()),color:new THREE.Color('#cfe8fd'),transparent:true,depthWrite:false})); halo.renderOrder=-1; scene.add(halo);
const atmoMat={uniforms:{uCol:{value:halo.material.color}}};
const rim=new THREE.Mesh(new THREE.SphereGeometry(1.006,96,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uCol:{value:halo.material.color}},
  vertexShader:`varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uCol;varying vec3 vN,vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),2.6);gl_FragColor=vec4(mix(uCol,vec3(1.),.35),f*.85);}`}));
scene.add(rim);
