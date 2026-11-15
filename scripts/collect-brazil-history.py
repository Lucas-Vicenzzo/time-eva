"""Download official monthly histories and catalog original-product archives.

No credentials are read or stored. Existing application datasets are untouched.
Run: .venv/bin/python scripts/collect-brazil-history.py
"""
import calendar
import csv
import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'NASA Data' / 'Historico Brasil'
POWER_ROOT = ROOT / 'fora-do-escopo-POWER'
SITES = [('amazonia', 'Amazônia', -4.5, -60), ('cerrado', 'Cerrado', -15, -47.5),
         ('nordeste', 'Nordeste', -7.5, -39), ('pantanal', 'Pantanal', -17.8, -56.7),
         ('sudeste', 'Sudeste', -22, -44.6), ('sul', 'Sul', -28.4, -51.4)]


def get(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'EVAdence-History/1.0'}), timeout=45) as r:
                return json.load(r)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


def trend(rows, key):
    x = np.array([r['year'] for r in rows], dtype=float)
    y = np.array([r[key] for r in rows], dtype=float)
    X = np.column_stack([np.ones(len(x)), x - x.mean()])
    b = np.linalg.lstsq(X, y, rcond=None)[0]
    e = y - X @ b
    # Newey-West covariance, Bartlett weights, 3 annual lags; approximate CI.
    z = X * e[:, None]
    meat = z.T @ z
    for lag in range(1, min(3, len(x)-1) + 1):
        term = z[lag:].T @ z[:-lag]
        meat += (1 - lag / 4) * (term + term.T)
    inv = np.linalg.inv(X.T @ X)
    cov = inv @ meat @ inv * len(x) / (len(x)-2)
    se = float(np.sqrt(max(0, cov[1, 1])))
    sen = np.median([(y[j]-y[i])/(x[j]-x[i]) for i in range(len(x)) for j in range(i+1,len(x))])
    return {'ols_per_decade': float(b[1]*10),
            'approx_95_ci_hac3': [float((b[1]-1.96*se)*10), float((b[1]+1.96*se)*10)],
            'sen_per_decade': float(sen*10), 'n_years': len(rows),
            'first_year': int(x[0]), 'last_year': int(x[-1])}


def collect():
    result = {'retrieved_at_utc': datetime.now(timezone.utc).isoformat(),
              'source': 'NASA POWER monthly point API', 'sites': [],
              'scope': 'Six model-grid point requests; not regional or national averages.',
              'comparison': 'POWER T2M and corrected precipitation are complementary products, not AIRS retrievals or M2SMNXEDI extreme indices.'}
    # POWER is not explicitly listed on the challenge's Resources tab.
    # It must never be collected by default for this constrained analysis.
    for ident, name, lat, lon in (SITES if '--include-power' in sys.argv else []):
        url = 'https://power.larc.nasa.gov/api/temporal/monthly/point?' + urlencode({
            'parameters': 'T2M,PRECTOTCORR', 'community': 'AG', 'longitude': lon,
            'latitude': lat, 'start': 1981, 'end': 2025, 'format': 'JSON'})
        path = POWER_ROOT / 'originais-power' / f'{ident}.json'
        if path.exists():
            raw = json.loads(path.read_text())
        else:
            raw = get(url)
            save(path, raw)
        params = raw['properties']['parameter']
        fill = raw.get('header', {}).get('fill_value', -999)
        annual, monthly = [], []
        for year in range(1981, 2026):
            yr = []
            for month in range(1, 13):
                k = f'{year}{month:02d}'
                t, p = (params[v].get(k) for v in ['T2M', 'PRECTOTCORR'])
                if any(v is None or v == fill or not np.isfinite(v) for v in [t, p]):
                    continue
                days = calendar.monthrange(year, month)[1]
                row = {'site': ident, 'year': year, 'month': month, 'days': days,
                       'temperature_c': t, 'precipitation_mm_day': p}
                monthly.append(row)
                yr.append(row)
            if len(yr) == 12:
                annual.append({'year': year,
                               'temperature_c': sum(r['temperature_c']*r['days'] for r in yr)/sum(r['days'] for r in yr),
                               'precipitation_mm_year': sum(r['precipitation_mm_day']*r['days'] for r in yr)})
        if len(annual) < 30:
            raise ValueError(f'{ident}: insufficient complete years: {len(annual)}')
        baseline = [r for r in annual if 1991 <= r['year'] <= 2020]
        if len(baseline) != 30:
            raise ValueError(f'{ident}: incomplete 1991-2020 baseline')
        normal = float(np.mean([r['temperature_c'] for r in baseline]))
        for row in annual:
            row['temperature_anomaly_c_1991_2020'] = row['temperature_c'] - normal
        result['sites'].append({'id': ident, 'name': name, 'requested_latitude': lat,
            'requested_longitude': lon, 'returned_geometry': raw.get('geometry'),
            'source_url': url, 'raw_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'monthly_records': len(monthly), 'complete_years': len(annual),
            'omitted_years': [y for y in range(1981,2026) if y not in [r['year'] for r in annual]],
            'baseline_temperature_c': normal, 'annual': annual,
            'trends': {key: trend(annual,key) for key in ['temperature_c','precipitation_mm_year']}})
        target = POWER_ROOT / f'{ident}-mensal.csv'
        with target.open('w') as f:
            w = csv.DictWriter(f, fieldnames=list(monthly[0])); w.writeheader(); w.writerows(monthly)
        save(POWER_ROOT / 'historico-e-tendencias.json', result)
        print(f'{name}: {len(monthly)} months, {len(annual)} complete years', flush=True)
        time.sleep(1)
    fields = ['site','year','temperature_c','precipitation_mm_year','temperature_anomaly_c_1991_2020']
    if result['sites']:
        with (POWER_ROOT / 'historico-anual.csv').open('w') as f:
            w = csv.DictWriter(f,fieldnames=fields);w.writeheader()
            for site in result['sites']:
                w.writerows(dict(site=site['id'],**row) for row in site['annual'])
    catalog = []
    for short, version in [('M2SMNXEDI','2'),('AIRS3STM','7.0')]:
        url='https://cmr.earthdata.nasa.gov/search/collections.json?'+urlencode({'short_name':short,'version':version,'page_size':10})
        raw=get(url);save(ROOT / 'catalogos' / f'{short}-collection.json',raw)
        entries=raw['feed']['entry']
        if not entries:
            raise ValueError(f'Collection not found: {short}')
        c=entries[0]
        url='https://cmr.earthdata.nasa.gov/search/granules.json?'+urlencode({'collection_concept_id':c['id'],'page_size':2000,'sort_key':'start_date','temporal':'1980-01-01T00:00:00Z,2026-11-14T23:59:59Z'})
        raw=get(url);save(ROOT / 'catalogos' / f'{short}-granules.json',raw)
        granules=raw['feed']['entry']
        rows=[]
        for g in granules:
            links=[l['href'] for l in g.get('links',[]) if l.get('rel','').endswith('/data#') and not l.get('inherited')]
            rows.append({'id':g['id'],'name':g.get('producer_granule_id'),'start':g.get('time_start'),'end':g.get('time_end'),'size_mb':g.get('granule_size'),'download_urls':links})
        save(ROOT / 'catalogos' / f'{short}-manifest.json',rows)
        catalog.append({'short_name':short,'collection_id':c['id'],'title':c['title'],
                        'collection_start':c.get('time_start'),'collection_end':c.get('time_end'),
                        'listed_files':len(rows),'downloads_require_earthdata':True,
                        'total_listed_mb':sum(float(g.get('granule_size') or 0) for g in granules)})
        print(f'{short}: cataloged {len(rows)} monthly files',flush=True)
    save(ROOT / 'catalogos' / 'resumo.json',catalog)


if __name__ == '__main__':
    collect()
