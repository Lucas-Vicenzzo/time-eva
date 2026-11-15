"""Extract a small, traceable demo from the supplied Earthdata files.

python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-nasa.txt
.venv/bin/python scripts/export-nasa.py
No network access or source-file changes are performed by this script.
"""
from pathlib import Path
import hashlib
import re
import calendar
from merra import extract_merra
import json
from netCDF4 import Dataset
from swaths import extract_airs, extract_sentinel

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'NASA Data'
OUT = ROOT / 'src/data/earthdata-demo.json'




files = []
for p in sorted(RAW.glob('*/*')):
    if not p.is_file():
        continue
    digest = hashlib.file_digest(p.open('rb'), 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(p.read_bytes()).hexdigest()
    files.append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': digest})

sets = []
merra = next(RAW.glob('Precipitation*/*.nc4'))
month = re.search(r'\.(\d{4})(\d{2})(?:[^\d]|$)', merra.name)
if not month:
    raise ValueError('Missing MERRA-2 observation month')
year, month = map(int, month.groups())
period = f'{year:04d}-{month:02d}-01 / {year:04d}-{month:02d}-{calendar.monthrange(year, month)[1]:02d}'
sets.append(extract_merra(merra, period, source_name=str(merra.relative_to(ROOT))))

airs = next(RAW.glob('Vegetation*/*.hdf'))
date = re.search(r'AIRS\.(\d{4})\.(\d{2})\.(\d{2})\.', airs.name)
if not date:
    raise ValueError('Missing AIRS observation date')
sets.append(extract_airs(airs, '-'.join(date.groups()), source_name=str(airs.relative_to(ROOT))))

s5p = next(RAW.glob('Atmosphere*/*.nc'))
with Dataset(s5p) as d:
    period = f'{d.time_coverage_start} / {d.time_coverage_end}'
sets.append(extract_sentinel(s5p, period, source_name=str(s5p.relative_to(ROOT))))

result = {'schemaVersion': 1, 'files': files, 'uniqueFiles': len(set(f['sha256'] for f in files)),
          'datasets': sets, 'historicalTrendSupported': False}
OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size:,} bytes')
for s in sets:
    print(s['id'], {k: {'displayed': len(v['points']), 'stats': v['stats']} for k, v in s['metrics'].items()})
