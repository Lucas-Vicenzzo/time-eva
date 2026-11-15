/* Dateline-safe polygon lookup, with bounding boxes to keep sample attribution fast. */
function prepareCountryRing(ring){
 const points=[];let last=null;
 for(const [longitude,latitude] of ring){let lon=longitude;if(last!==null){while(lon-last>180)lon-=360;while(lon-last<-180)lon+=360;}points.push([lon,latitude]);last=lon;}
 return{points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
}
function inCountryRing(lon,lat,ring){
 lon+=360*Math.round(((ring.minX+ring.maxX)/2-lon)/360);
 if(lon<ring.minX||lon>ring.maxX||lat<ring.minY||lat>ring.maxY)return false;
 let inside=false;const pts=ring.points;
 for(let i=0,j=pts.length-1;i<pts.length;j=i++){
  const [x,y]=pts[i],[px,py]=pts[j];if((y>lat)!==(py>lat)&&lon<(px-x)*(lat-y)/(py-y)+x)inside=!inside;
 }return inside;
}
function prepareCountry(feature){const g=feature.geometry;return{feature,polygons:(g.type==='Polygon'?[g.coordinates]:g.coordinates).map(p=>p.map(prepareCountryRing))};}
function countryAt(lon,lat,countries){return countries.find(c=>c.polygons.some(p=>inCountryRing(lon,lat,p[0])&&!p.slice(1).some(h=>inCountryRing(lon,lat,h))))||null;}
function countrySampleGroups(points,values,countries,lookup){
 const groups=new Map();points.forEach((point,i)=>{const country=lookup?lookup[i]:countryAt(point[0],point[1],countries);if(!country||!Number.isFinite(values[i]))return;const id=country.feature.id;const row=groups.get(id)||{country,sum:0,count:0,points:[]};row.sum+=values[i];row.count++;row.points.push(point);groups.set(id,row);});
 return [...groups.values()].map(g=>({...g,value:g.sum/g.count}));
}
