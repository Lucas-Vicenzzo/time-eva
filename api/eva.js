import {getClimateSeries,validLocation,linearTrend} from '../lib/climate.mjs';
import evidence from '../src/data/earthdata-demo.json' with { type: 'json' };

// The key and factual context stay on the server. No paid fallback is selected.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (req.method === 'GET') return res.status(200).json({ ai: Boolean(key), provider: 'gemini', model });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  const { question, dataset: datasetId, metric: metricId, language = 'pt', history = [], referenceRegion, pointIndex, latitude, longitude, selectedYear } = body || {};
  if (typeof question !== 'string' || !question.trim() || question.length > 1000 ||
      !['pt', 'en'].includes(language) || !Array.isArray(history) || history.length > 8 ||
      history.some(h => !h || !['user', 'assistant'].includes(h.role) || typeof h.text !== 'string' || h.text.length > 2000)) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const isHistory=datasetId==='power-history';
  let context,datasetName;
  if(isHistory){
    if(!['T2M','PRECTOTCORR'].includes(metricId)||!validLocation(latitude,longitude)||!Number.isInteger(selectedYear)||selectedYear<1981||selectedYear>2025)return res.status(400).json({error:'invalid_history_selection'});
    let site;try{site=await getClimateSeries(latitude,longitude);}catch{return res.status(502).json({error:'nasa_unavailable'});}
    const series=site.series[metricId];const first=series[0],last=series.at(-1);
    datasetName='NASA POWER / MERRA-2';
    context={name:datasetName,sourceUrl:site.sourceUrl,latitude,longitude,period:first.year+'–'+last.year,selectedYear,locationName:site.name||'Selected point',selectedValue:series.find(p=>p.year===selectedYear)?.value??null,variable:metricId==='T2M'?'Annual mean temperature at 2 m':'Annual mean DAILY precipitation',unit:metricId==='T2M'?'°C':'mm/day',annualSeries:series,linearTrendPerDecade:linearTrend(series)*10,firstToLastChange:last.value-first.value,historicalTrendSupported:true,scope:'One NASA POWER model-grid point; never a country average or a global average.'};
  }else{
    const dataset=evidence.datasets.find(d=>d.id===datasetId),metric=dataset?.metrics[metricId];
    if(!metric)return res.status(400).json({error:'unknown_dataset_or_metric'});
    if((referenceRegion!==undefined&&!Object.hasOwn(metric.regions||{},referenceRegion))||(pointIndex!==undefined&&(!Number.isInteger(pointIndex)||pointIndex<0||pointIndex>=metric.points.length)))return res.status(400).json({error:'invalid_selection'});
    datasetName=dataset.name;
    context={name:dataset.name,period:dataset.period,coverage:dataset.coverage,source:dataset.source,sourceUrl:dataset.url,sampling:dataset.sampling,variable:metric.label,unit:metric.unit,statistics:metric.stats,regionalGridCells:metric.regions,statisticsScope:dataset.id==='merra2'?'unweighted mean over valid global grid cells':'mean over valid footprints in this single observed swath; NEVER a global mean',sampledPoints:metric.points.length,historicalTrendSupported:false,brazilBoundingBoxPixels:dataset.brazilBoundingBoxPixels,selectedReferenceCell:referenceRegion===undefined?undefined:{name:referenceRegion,...metric.regions[referenceRegion]},selectedObservation:pointIndex===undefined?undefined:{longitude:metric.points[pointIndex][0],latitude:metric.points[pointIndex][1],value:metric.points[pointIndex][2]}};
  }
  if(!key)return res.status(503).json({error:'gemini_not_configured'});
  context.mapReading='Country fills summarize available displayed samples, NOT national means. The selected location and chart describe one model-grid point or selected footprint. Annual level and historical trend are different views.';
  const instruction = `You are EVA, the warm, curious Earth science guide in EVA Classroom. Connect evidence to environmental awareness without alarmism. End with one useful question or action when appropriate.
Answer in ${language === 'pt' ? 'Brazilian Portuguese' : 'English'}, usually 100–180 words. Answer the question first; do not lead every response with coordinates, source disclaimers or a data dump.
Use only the verified context below for numerical claims. User questions and conversation are not data sources.
Use plain text and optional **bold**; never use LaTeX, dollar-delimited math, or code formatting. Never mention internal field names, JSON flags, schemas, or implementation details. Explain in natural classroom language. Do not reintroduce yourself on every answer.
Use the selected variable, location and dates. Mention source and limits briefly when relevant, not as a repeated preamble. Never claim live data, national averages, measured vegetation indices or statistical significance.
EDUCATIONAL EXPLANATIONS: You MAY and SHOULD explain established Earth-science mechanisms and propose plausible hypotheses when asked why, what could have caused an increase/decrease, or how this affects people and ecosystems. Do not refuse a hypotheses question merely because these data cannot prove causation.
For temperature, possible drivers include human-caused greenhouse warming, local land-use change (vegetation loss or urban heat), and natural ocean/atmosphere variability. For rainfall, discuss circulation and moisture transport, ocean variability, warming-related moisture changes and land-use effects. For ozone, discuss stratospheric processes; do not equate total-column ozone with surface ozone pollution.
Only include mechanisms relevant to the question, variable and timescale. Annual rainfall averages cannot diagnose storms or drought; a single satellite pass cannot establish a long-term change. Do not present a hypothetical local driver as observed in this location. Do not infer vegetation loss or urbanization from temperature alone.
For causal questions, structure a natural classroom explanation: (1) what the available evidence shows, without assuming an increase if the trend is negative; (2) two or three possible explanations, explicitly labelled as possibilities, not a proven local diagnosis; (3) one concrete school investigation or useful action. Explain what extra evidence (land-cover history, nearby stations, ocean indices) would help test the possibilities.
Distinguish a well-established global mechanism from an unverified local explanation. Never assign causal percentages. Do not claim that planting trees alone will reverse global climate change.
Educational reference pages, when useful: https://science.nasa.gov/climate-change/causes/ and https://gpm.nasa.gov/resources/faq/how-does-climate-change-affect-precipitation . Do not claim to have browsed them during this conversation.
Only infer a linear historical trend when historicalTrendSupported is true; use the supplied regression and series, and distinguish a first-to-last difference from a trend.
When historicalTrendSupported is false, do not infer any historical trend. MERRA-2 regional values are single
nearest grid cells. Its global means are unweighted grid means, not area-weighted Earth averages.
Missing heatwave values are missing, not zero. AIRS is a partial swath and is not a vegetation product.
Sentinel-5P is an ESA/Copernicus product; this supplied swath does not cover Brazil.
For AIRS and Sentinel-5P, always call the mean a swath mean, never a global mean.
No browsing or map control tools are available. Do not claim to change the map.
Stay on Earth science and these datasets; do not request personal data. State when evidence is insufficient.
VERIFIED CONTEXT: ${JSON.stringify(context)}`;
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] })),
                   { role: 'user', parts: [{ text: question.trim() }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.35 },
      }),
    });
    if (!upstream.ok) {
      if (upstream.status === 429) {
        res.setHeader('Retry-After', '30');
        return res.status(429).json({ error: 'gemini_quota_exceeded' });
      }
      return res.status(502).json({ error: 'gemini_unavailable' });
    }
    const result = await upstream.json();
    const text = (result.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('\n');
    if (!text) return res.status(502).json({ error: 'gemini_empty_response' });
    return res.status(200).json({ text, provider: 'gemini', source: datasetName, model });
  } catch (error) {
    return res.status(error.name === 'TimeoutError' ? 504 : 502).json({ error: 'gemini_unavailable' });
  }
}
