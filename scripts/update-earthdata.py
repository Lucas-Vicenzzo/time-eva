"""Update MERRA-2, AIRS and Sentinel-5P observations from CMR. Raw downloads exist only in temporary storage."""
import argparse
import calendar
from datetime import datetime, timezone
import json
import os
import re
from pathlib import Path
import shutil
import tempfile
import time
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from merra import extract_merra, file_hash
from swaths import extract_airs, extract_sentinel, iso_time

ROOT = Path(__file__).resolve().parents[1]
CMR = 'https://cmr.earthdata.nasa.gov/search/'


def catalog_page(kind, params):
    url = CMR + kind + '.json?' + urlencode(params)
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'EVA-Classroom/1.0'}), timeout=60) as response:
                return json.load(response)['feed']['entry']
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def catalog(kind, **params):
    result, page = [], 1
    while True:
        entries = catalog_page(kind, dict(params, page_size=2000, page_num=page))
        result.extend(entries)
        if len(entries) < 2000:
            return result
        page += 1


def eligible(granules, floor, previous, now):
    selected = []
    for granule in granules:
        start = granule['time_start'][:10]
        year, month = map(int, start[:7].split('-'))
        end = f'{year:04d}-{month:02d}-{calendar.monthrange(year, month)[1]:02d}'
        if start[:7] < floor[:7] or end >= now[:10]:
            continue
        known = previous.get(granule['id'])
        revision = granule.get('updated')
        if not revision:
            raise ValueError('Granule has no revision timestamp')
        if not known or known['revision'] != revision:
            selected.append((granule, f'{year:04d}-{month:02d}-01 / {end}'))
    return sorted(selected, key=lambda item: (item[1], item[0]['updated']))


def data_url(granule, extensions=('.nc4',)):
    for link in granule.get('links', []):
        url = link.get('href', '')
        host = urlparse(url).hostname or ''
        if (link.get('rel', '').endswith('/data#') and not link.get('inherited')
                and url.startswith('https://') and host.endswith('.nasa.gov')
                and urlparse(url).path.lower().endswith(extensions) and 'opendap' not in url.lower()):
            return url
    raise ValueError('No supported NASA HTTPS data download link')


def download(url, target, token):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'Authorization': 'Bearer ' + token,
                        'User-Agent': 'EVA-Classroom/1.0'}), timeout=120) as response, open(target, 'wb') as out:
                expected = response.headers.get('Content-Length')
                shutil.copyfileobj(response, out, length=1024 * 1024)
            if not target.stat().st_size or (expected and target.stat().st_size != int(expected)):
                raise ValueError('Incomplete download')
            return
        except Exception:
            target.unlink(missing_ok=True)
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def update_merra(destination, discover_only=False):
    evidence_path = destination / 'src/data/earthdata-demo.json'
    evidence = json.loads(evidence_path.read_text())
    current = next(d for d in evidence['datasets'] if d['id'] == 'merra2')
    manifest_path = destination / 'data/processed/manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version': 1, 'files': {}}
    collections = catalog('collections', short_name='M2SMNXEDI', version='2', provider='GES_DISC')
    if len(collections) != 1:
        raise ValueError('Expected exactly one M2SMNXEDI version 2 collection')
    collection = collections[0]['id']
    floor = min([current['period']] + [r['period'] for r in manifest['files'].values() if r['collectionId'] == collection])
    granules = catalog('granules', collection_concept_id=collection,
                       temporal=floor.split(' / ')[0] + 'T00:00:00Z,', sort_key='start_date')
    candidates = eligible(granules, floor, manifest['files'], datetime.now(timezone.utc).isoformat())
    print(f'MERRA-2: {len(candidates)} new or revised monthly files')
    if discover_only or not candidates:
        return
    token = os.environ.get('EARTHDATA_TOKEN')
    if not token:
        raise ValueError('EARTHDATA_TOKEN is required for downloads')
    for granule, period in candidates:
        process_granule(destination, evidence, manifest, granule, period, collection,
                        'merra2', extract_merra, ('.nc4',), token)
    evidence['uniqueFiles'] = len({f['sha256'] for f in evidence['files']})
    evidence_path.write_text(json.dumps(evidence, separators=(',', ':'), allow_nan=False) + '\n')
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


def process_granule(destination, evidence, manifest, granule, period, collection, ident, extractor, extensions, token):
    granule_id = granule['id']
    if not re.fullmatch(r'G[0-9]+-[A-Z0-9_]+', granule_id):
        raise ValueError('Unexpected granule identifier')
    filename = period[:7] if ident == 'merra2' else granule_id
    relative = Path('data/processed') / ident / (filename + '.npz')
    url = data_url(granule, extensions)
    with tempfile.TemporaryDirectory(prefix='eva-earthdata-') as temporary:
        raw = Path(temporary) / ('source' + extensions[0])
        download(url, raw, token)
        source = 'Earthdata/' + granule['producer_granule_id']
        dataset = extractor(raw, period, destination / relative, source)
        record = {'datasetId': ident, 'collectionId': collection, 'granuleId': granule_id,
            'revision': granule['updated'], 'sourceUrl': url, 'period': period,
            'sha256': file_hash(raw), 'bytes': raw.stat().st_size,
            'processedPath': relative.as_posix(), 'processorVersion': 1}
    dataset['provenance'] = record
    manifest['files'][granule_id] = record
    current = next(d for d in evidence['datasets'] if d['id'] == ident)
    if iso_time(period.split(' / ')[0]) >= iso_time(current['period'].split(' / ')[0]):
        old_source = current['source']
        old_hash = next((f['sha256'] for f in evidence['files'] if f['path'] == old_source), None)
        evidence['datasets'] = [dataset if d['id'] == ident else d for d in evidence['datasets']]
        evidence['files'] = [f for f in evidence['files'] if f['path'] != old_source and (old_hash is None or f['sha256'] != old_hash)]
        evidence['files'].append({'path': source, 'bytes': record['bytes'], 'sha256': record['sha256']})


def swath_candidates(collection, current, known, now):
    # The app shows one swath per instrument, not an aggregation of all monthly passes.
    latest = catalog_page('granules', {'collection_concept_id': collection,
        'page_size': 1, 'sort_key': '-start_date', 'temporal': ',' + now})
    if not latest:
        raise ValueError('No swaths found in the selected collection')
    records = {g['id']: g for g in latest}
    for ident, record in known.items():
        rows = catalog('granules', collection_concept_id=collection, concept_id=ident)
        if len(rows) != 1:
            raise ValueError('Could not verify a previously processed swath')
        records[ident] = rows[0]
    result = []
    for granule in records.values():
        if iso_time(granule['time_end']) > iso_time(now):
            continue
        if iso_time(granule['time_start']) < iso_time(current['period'].split(' / ')[0]) and granule['id'] not in known:
            continue
        revision = granule.get('updated')
        if not revision:
            raise ValueError('Swath has no revision timestamp')
        if granule['id'] not in known or known[granule['id']]['revision'] != revision:
            result.append((granule, granule['time_start'] + ' / ' + granule['time_end']))
    return sorted(result, key=lambda item: iso_time(item[0]['time_start']))


def update_swaths(destination, discover_only=False):
    evidence_path = destination / 'src/data/earthdata-demo.json'
    evidence = json.loads(evidence_path.read_text())
    manifest_path = destination / 'data/processed/manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version': 1, 'files': {}}
    changed = False
    for ident, short, version, extensions, extractor in [
        ('airs', 'AIRS2SUP', '7.0', ('.hdf',), extract_airs),
        ('sentinel5p', 'S5P_L2__O3_TOT_HiR', '3', ('.nc',), extract_sentinel)]:
        collections = catalog('collections', short_name=short, version=version, provider='GES_DISC')
        if len(collections) != 1:
            raise ValueError(f'Expected one {short} version {version} collection')
        collection = collections[0]['id']
        current = next(d for d in evidence['datasets'] if d['id'] == ident)
        known = {key: record for key, record in manifest['files'].items() if record['collectionId'] == collection}
        candidates = swath_candidates(collection, current, known, datetime.now(timezone.utc).isoformat())
        print(f'{short}: {len(candidates)} new or revised swaths', flush=True)
        if discover_only or not candidates:
            continue
        token = os.environ.get('EARTHDATA_TOKEN')
        if not token:
            raise ValueError('EARTHDATA_TOKEN is required for downloads')
        for granule, period in candidates:
            process_granule(destination, evidence, manifest, granule, period, collection,
                            ident, extractor, extensions, token)
            changed = True
    if changed:
        evidence['uniqueFiles'] = len({f['sha256'] for f in evidence['files']})
        evidence_path.write_text(json.dumps(evidence, separators=(',', ':'), allow_nan=False) + '\n')
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


def update(destination, discover_only=False):
    update_merra(destination, discover_only)
    update_swaths(destination, discover_only)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, required=True, help='Staging directory, never the published source directory')
    parser.add_argument('--discover-only', action='store_true')
    args = parser.parse_args()
    if args.destination.resolve() == ROOT:
        parser.error('Use a separate staging directory')
    update(args.destination, args.discover_only)
