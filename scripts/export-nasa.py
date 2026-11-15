"""Extract a small, traceable demo from the supplied Earthdata files.

python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-nasa.txt
.venv/bin/python scripts/export-nasa.py
No network access or source-file changes are performed by this script.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from netCDF4 import Dataset
from pyhdf.SD import SD, SDC

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'NASA Data'
OUT = ROOT / 'src/data/earthdata-demo.json'


def stats(values):
    a = np.ma.asarray(values).compressed()
    a = a[np.isfinite(a)]
    return {'count': int(a.size), 'min': round(float(a.min()), 3),
            'max': round(float(a.max()), 3), 'mean': round(float(a.mean()), 3)}


def points(lat, lon, values, valid):
    return [[round(float(x), 4), round(float(y), 4), round(float(v), 3)]
            for x, y, v in zip(np.asarray(lon)[valid], np.asarray(lat)[valid], np.asarray(values)[valid])]


files = []
for p in sorted(RAW.glob('*/*')):
    if not p.is_file():
        continue
    digest = hashlib.file_digest(p.open('rb'), 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(p.read_bytes()).hexdigest()
    files.append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': digest})

sets = []
merra = next(RAW.glob('Precipitation*/*.nc4'))
regions = {'amazonia': (-4.5, -60), 'cerrado': (-15, -47.5), 'nordeste': (-7.5, -39),
           'pantanal': (-17.8, -56.7), 'sudeste': (-22, -44.6), 'sul': (-28.4, -51.4)}
with Dataset(merra) as d:
    lat, lon = d['lat'][:], d['lon'][:]
    xx, yy = np.meshgrid(lon[::8], lat[::8])
    metrics = {}
    for key, unit, pt, en in [
        ('drydays', 'days', 'Dias secos', 'Dry days'),
        ('RX1Day', 'mm/day', 'Maior chuva em um dia', 'Maximum one-day rainfall'),
        ('HWD', 'days', 'Duração da maior onda de calor', 'Longest heatwave')]:
        a = d[key][0]
        sample = a[::8, ::8]
        valid = ~np.ma.getmaskarray(sample) & np.isfinite(sample.filled(np.nan))
        cells = {}
        for region, (la, lo) in regions.items():
            i, j = int(np.argmin(abs(lat-la))), int(np.argmin(abs(lon-lo)))
            v = a[i, j]
            cells[region] = {'lat': float(lat[i]), 'lon': float(lon[j]),
                             'value': None if np.ma.is_masked(v) else round(float(v), 3)}
        metrics[key] = {'label': {'pt': pt, 'en': en}, 'unit': unit,
                        'description': str(d[key].long_name), 'sourceUnit': str(d[key].units),
                        'points': points(yy, xx, sample.filled(np.nan), valid),
                        'stats': stats(a), 'regions': cells}
    sets.append({'id': 'merra2', 'name': 'MERRA-2', 'source': str(merra.relative_to(ROOT)),
                 'period': '2026-09-01 / 2026-09-30', 'coverage': 'global-grid',
                 'url': 'https://gmao.gsfc.nasa.gov/pubs/docs/Collow1466.pdf',
                 'sampling': 'Every 8th latitude and longitude cell; no interpolation. Statistics use all valid cells (unweighted). Regional values are single nearest grid cells, not regional averages.',
                 'metrics': metrics})

airs = next(RAW.glob('Vegetation*/*.hdf'))
d = SD(str(airs), SDC.READ)
lat, lon = d.select('Latitude')[:], d.select('Longitude')[:]
a = d.select('TSurfAir')[:]
qc = d.select('TSurfAir_QC')[:]
valid = (qc <= 1) & np.isfinite(a) & (a > 100) & (a < 400)
values = a - 273.15
sets.append({'id': 'airs', 'name': 'AIRS / Aqua', 'source': str(airs.relative_to(ROOT)),
             'period': '2026-01-01', 'coverage': 'single-swath',
             'url': 'https://airs.jpl.nasa.gov/data/about-the-data/',
             'sampling': 'All valid TSurfAir footprints with TSurfAir_QC <= 1; kelvin converted to degrees Celsius. One granule, no spatial interpolation.',
             'metrics': {'TSurfAir': {'label': {'pt': 'Temperatura do ar na superfície', 'en': 'Surface air temperature'},
                                      'unit': '°C', 'sourceUnit': 'K',
                                      'points': points(lat, lon, values, valid), 'stats': stats(values[valid])}}})
d.end()

s5p = next(RAW.glob('Atmosphere*/*.nc'))
with Dataset(s5p) as d:
    g = d.groups['PRODUCT']
    lat, lon = g['latitude'][0], g['longitude'][0]
    a, qa = g['ozone_total_vertical_column'][0], g['qa_value'][0]
    valid = (~np.ma.getmaskarray(a) & ~np.ma.getmaskarray(qa)
             & np.isfinite(a.filled(np.nan)) & (qa.filled(0) >= .5))
    # 1 DU = 4.4615e-4 mol/m². Preserve source units and conversion in metadata.
    values = a / 4.4615e-4
    stride = np.zeros(valid.shape, dtype=bool)
    stride[::12, ::12] = True
    valid_sample = valid & stride
    bbox = (lat >= -34) & (lat <= 6) & (lon >= -74) & (lon <= -34)
    sets.append({'id': 'sentinel5p', 'name': 'Sentinel-5P / TROPOMI', 'source': str(s5p.relative_to(ROOT)),
                 'period': f'{d.time_coverage_start} / {d.time_coverage_end}', 'coverage': 'single-swath',
                 'url': 'https://www.tropomi.eu/data-products/total-ozone-column',
                 'sampling': 'Every 12th scanline and ground pixel with qa_value >= 0.5. Statistics use all valid footprints. 1 DU = 4.4615e-4 mol/m².',
                 'brazilBoundingBoxPixels': int(bbox.sum()),
                 'metrics': {'ozone': {'label': {'pt': 'Coluna total de ozônio', 'en': 'Total ozone column'},
                                        'unit': 'DU', 'sourceUnit': str(g['ozone_total_vertical_column'].units),
                                        'points': points(lat, lon, values.filled(np.nan), valid_sample),
                                        'stats': stats(values[valid])}}})

result = {'schemaVersion': 1, 'files': files, 'uniqueFiles': len(set(f['sha256'] for f in files)),
          'datasets': sets, 'historicalTrendSupported': False}
OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size:,} bytes')
for s in sets:
    print(s['id'], {k: {'displayed': len(v['points']), 'stats': v['stats']} for k, v in s['metrics'].items()})
