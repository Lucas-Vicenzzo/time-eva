import {getClimateSeries,validLocation} from '../lib/climate.mjs';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
 const params=new URL(req.url,'https://eva.local').searchParams;
 if(!params.has('lat')||!params.has('lon'))return res.status(400).json({error:'missing_location'});
 const lat=Number(params.get('lat')),lon=Number(params.get('lon'));
 if(!params.get('lat').trim()||!params.get('lon').trim()||!validLocation(lat,lon))return res.status(400).json({error:'invalid_location'});
 try{const series=await getClimateSeries(lat,lon);res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(series);}
 catch(e){return res.status(e.message==='nasa_quota'?429:502).json({error:e.message==='nasa_quota'?'nasa_quota':'nasa_unavailable'});}
}
